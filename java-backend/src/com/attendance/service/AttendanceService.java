package com.attendance.service;

import com.attendance.dao.*;
import com.attendance.exception.DuplicateAttendanceException;
import com.attendance.exception.InvalidStudentException;
import com.attendance.exception.LowAttendanceException;
import com.attendance.model.AttendanceRecord;
import com.attendance.model.Person;
import com.attendance.model.Student;
import com.attendance.model.Teacher;
import com.attendance.util.ByteStreamBackupUtil;
import com.attendance.util.GenericProcessor;
import com.attendance.util.Pair;
import com.attendance.util.ValidationUtil;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.SQLException;
import java.util.*;

/**
 * Core service coordinating Repository<T, ID>, custom exceptions, CollectionsDirectory,
 * teacher auth, and background backup/report threads.
 */
public class AttendanceService {
    private final Repository<Student, Integer> studentRepo;
    private final AttendanceJdbcDAO attendanceDao;
    private final TeacherJdbcDAO teacherDao;
    private final CollectionsDirectory directory;
    private final BackupTask backupTask;
    private final ReportGeneratorThread reportThread;
    private final byte[] jwtSecret;

    public AttendanceService(BackupTask backupTask, ReportGeneratorThread reportThread) throws SQLException {
        this.studentRepo = new Repository.JdbcRepository<>(new StudentJdbcDAO());
        this.attendanceDao = new AttendanceJdbcDAO();
        this.teacherDao = new TeacherJdbcDAO();
        this.directory = new CollectionsDirectory();
        this.backupTask = backupTask;
        this.reportThread = reportThread;

        byte[] secret = new byte[32];
        new SecureRandom().nextBytes(secret);
        this.jwtSecret = secret;

        seedInitialData();
        refreshDirectory();
    }

    private void seedInitialData() throws SQLException {
        if (teacherDao.findAll().isEmpty()) {
            teacherDao.save(new Teacher(
                    "t-1001",
                    "Prof. Anjali Menon",
                    "teacher@college.edu",
                    "Computer Science",
                    hashPassword("password123")
            ));
        }
        if (studentRepo.list().isEmpty()) {
            loadSampleData();
        }
    }

    public synchronized void refreshDirectory() throws SQLException {
        List<Student> students = studentRepo.list();
        List<AttendanceRecord> records = attendanceDao.findAll();
        computeStats(students, records);
        directory.rebuild(students, records);
        reportThread.triggerGeneration();
    }

    private void computeStats(List<Student> students, List<AttendanceRecord> records) {
        Map<Integer, Student> byRoll = new HashMap<>();
        for (Student s : students) {
            s.updateStats(0, 0);
            byRoll.put(s.getRollNo(), s);
        }
        for (AttendanceRecord r : records) {
            Student s = byRoll.get(r.getRollNo());
            if (s != null) {
                s.updateStats(r.getStatus());
            }
        }
    }

    public Student addStudent(String rawRoll, String name) throws InvalidStudentException, SQLException {
        int roll = ValidationUtil.parsePositiveRollNo(rawRoll);
        ValidationUtil.validateStudentName(name);
        if (studentRepo.get(roll).isPresent()) {
            throw new InvalidStudentException("Student with Roll Number " + roll + " already exists.", 409);
        }
        Student student = new Student(roll, name.trim());
        studentRepo.add(student);
        directory.appendAudit("Added Student Roll " + roll + " (" + student.getName() + ")");
        refreshDirectory();
        return student;
    }

    public void deleteStudent(int rollNo) throws InvalidStudentException, SQLException {
        if (!studentRepo.remove(rollNo)) {
            throw new InvalidStudentException("Student not found for Roll " + rollNo, 404);
        }
        directory.appendAudit("Removed Student Roll " + rollNo);
        refreshDirectory();
    }

    public void markAttendance(String date, String subject, Map<Integer, String> statusByRoll, boolean replaceExisting)
            throws DuplicateAttendanceException, InvalidStudentException, SQLException {
        ValidationUtil.validateIsoDate(date);
        if (subject == null || subject.trim().isEmpty() || subject.contains(",")) {
            throw new IllegalArgumentException("Enter a valid subject name without commas.");
        }
        String cleanSubject = subject.trim();
        List<Student> students = studentRepo.list();
        if (students.isEmpty()) {
            throw new InvalidStudentException("Register students first before marking attendance.", 400);
        }
        if (!replaceExisting && attendanceDao.existsSession(date, cleanSubject)) {
            throw new DuplicateAttendanceException(date, cleanSubject);
        }

        List<AttendanceRecord> batch = new ArrayList<>();
        for (Student s : students) {
            String st = statusByRoll.get(s.getRollNo());
            if (!"P".equals(st) && !"A".equals(st)) {
                throw new InvalidStudentException("Missing valid status (P or A) for Roll " + s.getRollNo(), 400);
            }
            batch.add(new AttendanceRecord(date, cleanSubject, s.getRollNo(), st));
        }

        attendanceDao.saveSessionBatch(batch, replaceExisting);
        directory.appendAudit((replaceExisting ? "Updated " : "Marked ") + cleanSubject + " on " + date);
        refreshDirectory();
    }

    public void correctAttendance(int rollNo, String subject, String date, String newStatus)
            throws InvalidStudentException, SQLException {
        ValidationUtil.validateIsoDate(date);
        if (!"P".equals(newStatus) && !"A".equals(newStatus)) {
            throw new IllegalArgumentException("Status must be P or A.");
        }
        boolean updated = attendanceDao.correctStatus(rollNo, subject, date, newStatus);
        if (!updated) {
            throw new InvalidStudentException("Attendance record not found!", 404);
        }
        directory.appendAudit("Corrected Roll " + rollNo + " (" + subject + " · " + date + ") -> " + newStatus);
        refreshDirectory();
    }

    public void checkStudentEligibility(int rollNo) throws InvalidStudentException, LowAttendanceException, SQLException {
        Student student = studentRepo.get(rollNo)
                .orElseThrow(() -> new InvalidStudentException("Student not found for Roll " + rollNo, 404));
        computeStats(List.of(student), attendanceDao.findAll());
        if (student.getTotalClasses() > 0 && !student.isEligible()) {
            throw new LowAttendanceException(rollNo, student.getAttendancePercentage());
        }
    }

    public List<String> getPolymorphicSummaryLines() throws SQLException {
        List<Person> people = new ArrayList<>();
        people.addAll(studentRepo.list());
        people.addAll(teacherDao.findAll());
        return GenericProcessor.summarizeAllMembers(people);
    }

    public Pair<Long, Long> triggerBackupAndReport() throws IOException {
        backupTask.requestImmediateBackup();
        File src = new File(SqliteConnectionManager.DB_PATH);
        File dst = new File("data/backups/manual_snapshot.db");
        long bytes = src.exists() ? ByteStreamBackupUtil.copyUsingByteStreams(src, dst) : 0L;
        return new Pair<>(bytes, backupTask.getLastBackupBytes());
    }

    public void restoreFromBackup() throws IOException, SQLException {
        File backup = new File("data/backups/attendance_backup.db");
        File target = new File(SqliteConnectionManager.DB_PATH);
        ByteStreamBackupUtil.copyUsingByteStreams(backup, target);
        refreshDirectory();
    }

    public synchronized void loadSampleData() throws SQLException {
        attendanceDao.deleteAll();
        for (Student s : studentRepo.list()) {
            studentRepo.remove(s.getRollNo());
        }
        List<Student> sampleStudents = List.of(
                new Student(101, "Aarav Sharma"),
                new Student(102, "Diya Nair"),
                new Student(103, "Rohan Kulkarni"),
                new Student(104, "Meera Krishnan"),
                new Student(105, "Kabir Malhotra"),
                new Student(106, "Ananya Verma"),
                new Student(107, "Vikram Patel"),
                new Student(108, "Sneha Iyer"),
                new Student(109, "Siddharth Rao"),
                new Student(110, "Ishita Bose")
        );
        for (Student s : sampleStudents) {
            studentRepo.add(s);
        }

        Object[][] sessions = {
                {"2026-11-09", "Data Structures", Set.of(103, 107)},
                {"2026-11-10", "Discrete Mathematics", Set.of(103, 105, 109)},
                {"2026-11-11", "Operating Systems", Set.of(107, 109)},
                {"2026-11-12", "Data Structures", Set.of(103, 105, 107)},
                {"2026-11-13", "Discrete Mathematics", Set.of(103, 109)},
                {"2026-11-16", "Operating Systems", Set.of(105, 107, 109)},
                {"2026-11-17", "Data Structures", Set.of(103, 107)},
                {"2026-11-18", "Discrete Mathematics", Set.of(102, 107, 109)}
        };
        List<AttendanceRecord> batch = new ArrayList<>();
        for (Object[] session : sessions) {
            String date = (String) session[0];
            String subject = (String) session[1];
            @SuppressWarnings("unchecked")
            Set<Integer> absent = (Set<Integer>) session[2];
            for (Student s : sampleStudents) {
                batch.add(new AttendanceRecord(date, subject, s.getRollNo(), absent.contains(s.getRollNo()) ? "A" : "P"));
            }
        }
        attendanceDao.saveSessionBatch(batch, false);
        refreshDirectory();
    }

    public synchronized void clearAllData() throws SQLException {
        attendanceDao.deleteAll();
        for (Student s : studentRepo.list()) {
            studentRepo.remove(s.getRollNo());
        }
        refreshDirectory();
    }

    public List<Student> getStudents() throws SQLException {
        return studentRepo.list();
    }

    public List<AttendanceRecord> getRecords() throws SQLException {
        return attendanceDao.findAll();
    }

    public CollectionsDirectory getDirectory() {
        return directory;
    }

    public String exportStudentsCsv() throws SQLException {
        StringBuilder sb = new StringBuilder();
        for (Student s : studentRepo.list()) {
            sb.append(s.getRollNo()).append(",").append(s.getName()).append("\n");
        }
        return sb.toString();
    }

    public String exportAttendanceCsv() throws SQLException {
        StringBuilder sb = new StringBuilder();
        for (AttendanceRecord r : attendanceDao.findAll()) {
            sb.append(r.getDate()).append(",")
              .append(r.getSubject()).append(",")
              .append(r.getRollNo()).append(",")
              .append(r.getStatus()).append("\n");
        }
        return sb.toString();
    }

    public synchronized void importStudentsCsv(String csv) throws InvalidStudentException, SQLException {
        if (csv == null || csv.isBlank()) {
            throw new IllegalArgumentException("CSV content cannot be empty.");
        }
        List<Student> parsed = new ArrayList<>();
        Set<Integer> seen = new HashSet<>();
        for (String rawLine : csv.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.toLowerCase().startsWith("roll")) continue;
            String[] cols = line.split(",", 2);
            if (cols.length < 2) {
                throw new InvalidStudentException("Invalid CSV row: " + line, 400);
            }
            int roll = ValidationUtil.parsePositiveRollNo(cols[0]);
            String name = cols[1].trim();
            ValidationUtil.validateStudentName(name);
            if (!seen.add(roll)) {
                throw new InvalidStudentException("Duplicate roll number in CSV: " + roll, 409);
            }
            parsed.add(new Student(roll, name));
        }
        attendanceDao.deleteAll();
        for (Student existing : studentRepo.list()) {
            studentRepo.remove(existing.getRollNo());
        }
        for (Student s : parsed) {
            studentRepo.add(s);
        }
        directory.appendAudit("Imported " + parsed.size() + " students from CSV");
        refreshDirectory();
    }

    public synchronized void importAttendanceCsv(String csv) throws InvalidStudentException, SQLException {
        if (csv == null || csv.isBlank()) {
            throw new IllegalArgumentException("CSV content cannot be empty.");
        }
        Set<Integer> validRolls = new HashSet<>();
        for (Student s : studentRepo.list()) {
            validRolls.add(s.getRollNo());
        }
        List<AttendanceRecord> batch = new ArrayList<>();
        for (String rawLine : csv.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.toLowerCase().startsWith("date,")) continue;
            String[] cols = line.split(",");
            if (cols.length < 4) {
                throw new IllegalArgumentException("Invalid attendance CSV row: " + line);
            }
            String date = cols[0].trim();
            String subject = cols[1].trim();
            int roll = ValidationUtil.parsePositiveRollNo(cols[2]);
            String status = cols[3].trim().toUpperCase();
            ValidationUtil.validateIsoDate(date);
            if (subject.isEmpty() || (!"P".equals(status) && !"A".equals(status))) {
                throw new IllegalArgumentException("Invalid subject or status in CSV row: " + line);
            }
            if (!validRolls.contains(roll)) {
                throw new InvalidStudentException("Unknown Roll " + roll + " in attendance CSV.", 400);
            }
            batch.add(new AttendanceRecord(date, subject, roll, status));
        }
        attendanceDao.deleteAll();
        if (!batch.isEmpty()) {
            attendanceDao.saveSessionBatch(batch, false);
        }
        directory.appendAudit("Imported " + batch.size() + " attendance records from CSV");
        refreshDirectory();
    }

    // Teacher Auth Helpers
    public Pair<String, Teacher> loginTeacher(String email, String password) throws SQLException {
        Teacher teacher = teacherDao.findByEmail(email)
                .orElseThrow(() -> new SecurityException("Invalid email or password."));
        if (!verifyPassword(password, teacher.getPasswordHash())) {
            throw new SecurityException("Invalid email or password.");
        }
        return new Pair<>(signToken(teacher), teacher);
    }

    public Pair<String, Teacher> registerTeacher(String name, String email, String department, String password)
            throws SQLException {
        if (name == null || name.isBlank() || name.contains(",")) {
            throw new IllegalArgumentException("Enter a valid full name without commas.");
        }
        if (email == null || !email.contains("@") || email.contains(",")) {
            throw new IllegalArgumentException("Enter a valid faculty email address.");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long.");
        }
        if (teacherDao.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("A teacher account with this email already exists.");
        }
        Teacher t = new Teacher("t-" + System.currentTimeMillis(), name.trim(), email.trim().toLowerCase(),
                department, hashPassword(password));
        teacherDao.save(t);
        return new Pair<>(signToken(t), t);
    }

    public Optional<Teacher> verifyToken(String token) {
        try {
            if (token == null || !token.contains(".")) return Optional.empty();
            String[] parts = token.split("\\.", 2);
            String expected = hmacSha256(parts[0]);
            if (!MessageDigest.isEqual(parts[1].getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8))) {
                return Optional.empty();
            }
            String decoded = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String id = decoded.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
            return teacherDao.findById(id);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String hashPassword(String password) {
        try {
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 65536, 256);
            byte[] hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private boolean verifyPassword(String password, String stored) {
        try {
            String[] parts = stored.split(":");
            byte[] salt = Base64.getDecoder().decode(parts[0]);
            byte[] expected = Base64.getDecoder().decode(parts[1]);
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, 65536, 256);
            byte[] actual = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            return MessageDigest.isEqual(expected, actual);
        } catch (Exception e) {
            return false;
        }
    }

    private String signToken(Teacher t) {
        String payload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(("{\"sub\":\"" + t.getId() + "\"}").getBytes(StandardCharsets.UTF_8));
        return payload + "." + hmacSha256(payload);
    }

    private String hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
