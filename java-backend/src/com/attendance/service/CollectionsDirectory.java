package com.attendance.service;

import com.attendance.model.AttendanceRecord;
import com.attendance.model.Student;
import com.attendance.util.Pair;

import java.util.*;

/**
 * Unit 4 & 5: Organizes attendance data using Java Collections Framework:
 * ArrayList, LinkedList, Vector, HashSet, TreeSet, HashMap, Hashtable, TreeMap, and Iterator.
 */
public class CollectionsDirectory {
    private final ArrayList<Student> studentList = new ArrayList<>();
    private final LinkedList<String> recentAuditQueue = new LinkedList<>();
    private final Vector<AttendanceRecord> synchronizedRecordLog = new Vector<>();
    private final HashSet<Integer> registeredRollSet = new HashSet<>();
    private final TreeSet<String> sortedSubjects = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
    private final HashMap<Integer, Student> rollToStudentMap = new HashMap<>();
    private final Hashtable<String, Integer> subjectSessionCount = new Hashtable<>();
    private final TreeMap<String, List<AttendanceRecord>> recordsByDateDesc =
            new TreeMap<>(Comparator.reverseOrder());

    public synchronized void rebuild(List<Student> students, List<AttendanceRecord> records) {
        studentList.clear();
        synchronizedRecordLog.clear();
        registeredRollSet.clear();
        sortedSubjects.clear();
        rollToStudentMap.clear();
        subjectSessionCount.clear();
        recordsByDateDesc.clear();

        // Populate ArrayList, HashSet, and HashMap
        Iterator<Student> studentIt = students.iterator();
        while (studentIt.hasNext()) {
            Student s = studentIt.next();
            studentList.add(s);
            registeredRollSet.add(s.getRollNo());
            rollToStudentMap.put(s.getRollNo(), s);
        }

        // Track unique (date, subject) sessions with HashSet before populating Hashtable
        HashSet<String> uniqueSessions = new HashSet<>();
        Iterator<AttendanceRecord> recIt = records.iterator();
        while (recIt.hasNext()) {
            AttendanceRecord r = recIt.next();
            synchronizedRecordLog.add(r);
            sortedSubjects.add(r.getSubject());
            recordsByDateDesc.computeIfAbsent(r.getDate(), k -> new ArrayList<>()).add(r);

            String sessionKey = r.getDate() + "::" + r.getSubject().toLowerCase();
            if (uniqueSessions.add(sessionKey)) {
                subjectSessionCount.merge(r.getSubject(), 1, Integer::sum);
            }
        }
    }

    public synchronized void appendAudit(String message) {
        recentAuditQueue.addFirst(message);
        if (recentAuditQueue.size() > 25) {
            recentAuditQueue.removeLast();
        }
    }

    public synchronized Pair<Integer, Integer> getDirectoryCounts() {
        return new Pair<>(registeredRollSet.size(), synchronizedRecordLog.size());
    }

    public synchronized ArrayList<Student> getStudents() {
        return new ArrayList<>(studentList);
    }

    public synchronized TreeSet<String> getSortedSubjects() {
        return new TreeSet<>(sortedSubjects);
    }

    public synchronized TreeMap<String, List<AttendanceRecord>> getRecordsByDateDesc() {
        return new TreeMap<>(recordsByDateDesc);
    }

    public synchronized List<String> getRecentAuditsUsingIterator() {
        List<String> out = new ArrayList<>();
        Iterator<String> it = recentAuditQueue.iterator();
        while (it.hasNext()) {
            out.add(it.next());
        }
        return out;
    }

    public synchronized Hashtable<String, Integer> getSubjectSessionCounts() {
        return new Hashtable<>(subjectSessionCount);
    }
}
