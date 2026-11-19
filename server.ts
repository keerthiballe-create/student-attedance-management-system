import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface Student {
  rollNo: number;
  name: string;
}

export interface AttendanceRecord {
  date: string;
  subject: string;
  rollNo: number;
  status: 'P' | 'A';
}

interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  passwordHash: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STUDENTS_CSV = path.join(DATA_DIR, 'students.csv');
const ATTENDANCE_CSV = path.join(DATA_DIR, 'attendance.csv');
const TEACHERS_CSV = path.join(DATA_DIR, 'teachers.csv');
const AUTH_SECRET_FILE = path.join(DATA_DIR, '.auth-secret');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function loadStudents(): Student[] {
  ensureDataDir();
  if (!fs.existsSync(STUDENTS_CSV)) {
    return [];
  }
  const content = fs.readFileSync(STUDENTS_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const students: Student[] = [];
  for (const line of lines) {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const rollStr = line.slice(0, commaIdx).trim();
    const name = line.slice(commaIdx + 1).trim();
    const rollNo = Number(rollStr);
    if (Number.isInteger(rollNo) && rollNo > 0 && name.length > 0) {
      students.push({ rollNo, name });
    }
  }
  students.sort((a, b) => a.rollNo - b.rollNo);
  return students;
}

function saveStudents(students: Student[]): void {
  ensureDataDir();
  const sorted = [...students].sort((a, b) => a.rollNo - b.rollNo);
  const content = sorted.map((s) => `${s.rollNo},${s.name}`).join('\n') + (sorted.length > 0 ? '\n' : '');
  fs.writeFileSync(STUDENTS_CSV, content, 'utf-8');
}

function loadAttendance(): AttendanceRecord[] {
  ensureDataDir();
  if (!fs.existsSync(ATTENDANCE_CSV)) {
    return [];
  }
  const content = fs.readFileSync(ATTENDANCE_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records: AttendanceRecord[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 4) continue;
    const date = parts[0].trim();
    const subject = parts[1].trim();
    const rollNo = Number(parts[2].trim());
    const status = parts[3].trim().toUpperCase();
    if (isValidIsoDate(date) && subject.length > 0 && Number.isInteger(rollNo) && (status === 'P' || status === 'A')) {
      records.push({ date, subject, rollNo, status });
    }
  }
  return records;
}

function saveAttendance(records: AttendanceRecord[]): void {
  ensureDataDir();
  const content =
    records.map((r) => `${r.date},${r.subject},${r.rollNo},${r.status}`).join('\n') +
    (records.length > 0 ? '\n' : '');
  fs.writeFileSync(ATTENDANCE_CSV, content, 'utf-8');
}

function getSampleData(): { students: Student[]; records: AttendanceRecord[] } {
  const students: Student[] = [
    { rollNo: 101, name: 'Aarav Sharma' },
    { rollNo: 102, name: 'Diya Nair' },
    { rollNo: 103, name: 'Rohan Kulkarni' },
    { rollNo: 104, name: 'Meera Krishnan' },
    { rollNo: 105, name: 'Kabir Malhotra' },
    { rollNo: 106, name: 'Ananya Verma' },
    { rollNo: 107, name: 'Vikram Patel' },
    { rollNo: 108, name: 'Sneha Iyer' },
    { rollNo: 109, name: 'Siddharth Rao' },
    { rollNo: 110, name: 'Ishita Bose' },
  ];

  const sessions: Array<{ date: string; subject: string; absentRolls: number[] }> = [
    { date: '2026-11-09', subject: 'Data Structures', absentRolls: [103, 107] },
    { date: '2026-11-10', subject: 'Discrete Mathematics', absentRolls: [103, 105, 109] },
    { date: '2026-11-11', subject: 'Operating Systems', absentRolls: [107, 109] },
    { date: '2026-11-12', subject: 'Data Structures', absentRolls: [103, 105, 107] },
    { date: '2026-11-13', subject: 'Discrete Mathematics', absentRolls: [103, 109] },
    { date: '2026-11-16', subject: 'Operating Systems', absentRolls: [105, 107, 109] },
    { date: '2026-11-17', subject: 'Data Structures', absentRolls: [103, 107] },
    { date: '2026-11-18', subject: 'Discrete Mathematics', absentRolls: [102, 107, 109] },
  ];

  const records: AttendanceRecord[] = [];
  for (const session of sessions) {
    for (const student of students) {
      records.push({
        date: session.date,
        subject: session.subject,
        rollNo: student.rollNo,
        status: session.absentRolls.includes(student.rollNo) ? 'A' : 'P',
      });
    }
  }

  return { students, records };
}

function getAuthSecret(): string {
  ensureDataDir();
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }
  if (fs.existsSync(AUTH_SECRET_FILE)) {
    return fs.readFileSync(AUTH_SECRET_FILE, 'utf-8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(AUTH_SECRET_FILE, secret, 'utf-8');
  return secret;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function loadTeachers(): TeacherRecord[] {
  ensureDataDir();
  if (!fs.existsSync(TEACHERS_CSV)) {
    return [];
  }
  const content = fs.readFileSync(TEACHERS_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const teachers: TeacherRecord[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 5) continue;
    teachers.push({
      id: parts[0].trim(),
      name: parts[1].trim(),
      email: parts[2].trim().toLowerCase(),
      department: parts[3].trim(),
      passwordHash: parts[4].trim(),
    });
  }
  return teachers;
}

function saveTeachers(teachers: TeacherRecord[]): void {
  ensureDataDir();
  const content =
    teachers
      .map((t) => `${t.id},${t.name},${t.email},${t.department},${t.passwordHash}`)
      .join('\n') + (teachers.length > 0 ? '\n' : '');
  fs.writeFileSync(TEACHERS_CSV, content, 'utf-8');
}

function signToken(teacher: TeacherRecord): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: teacher.id,
      email: teacher.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): TeacherRecord | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!decoded.sub || !decoded.exp || Date.now() > decoded.exp) {
      return null;
    }
    const teachers = loadTeachers();
    return teachers.find((t) => t.id === decoded.sub) ?? null;
  } catch {
    return null;
  }
}

function sanitizeTeacher(t: TeacherRecord) {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    department: t.department,
  };
}

function seedIfNeeded(): void {
  ensureDataDir();
  if (!fs.existsSync(STUDENTS_CSV) && !fs.existsSync(ATTENDANCE_CSV)) {
    const sample = getSampleData();
    saveStudents(sample.students);
    saveAttendance(sample.records);
  }
  if (!fs.existsSync(TEACHERS_CSV)) {
    saveTeachers([
      {
        id: 't-1001',
        name: 'Prof. Anjali Menon',
        email: 'teacher@college.edu',
        department: 'Computer Science',
        passwordHash: hashPassword('password123'),
      },
    ]);
  }
}

function buildStateResponse() {
  const students = loadStudents();
  const records = loadAttendance();
  const subjects = Array.from(new Set(records.map((r) => r.subject))).sort((a, b) => a.localeCompare(b));
  const dates = Array.from(new Set(records.map((r) => r.date))).sort((a, b) => b.localeCompare(a));
  return { students, records, subjects, dates };
}

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const teacher = token ? verifyToken(token) : null;
  if (!teacher) {
    res.status(401).json({ error: 'Teacher authentication required.' });
    return;
  }
  next();
}

async function startServer() {
  seedIfNeeded();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/auth/login', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Enter both faculty email and password.' });
      return;
    }

    const teachers = loadTeachers();
    const teacher = teachers.find((t) => t.email === email);
    if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(teacher);
    res.json({ token, teacher: sanitizeTeacher(teacher) });
  });

  app.post('/api/auth/register', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const department =
      typeof req.body?.department === 'string' && req.body.department.trim().length > 0
        ? req.body.department.trim()
        : 'Faculty';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || name.includes(',')) {
      res.status(400).json({ error: 'Enter a valid full name without commas.' });
      return;
    }
    if (!email || !email.includes('@') || email.includes(',')) {
      res.status(400).json({ error: 'Enter a valid faculty email address.' });
      return;
    }
    if (department.includes(',')) {
      res.status(400).json({ error: 'Department cannot contain commas.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const teachers = loadTeachers();
    if (teachers.some((t) => t.email === email)) {
      res.status(409).json({ error: 'A teacher account with this email already exists.' });
      return;
    }

    const newTeacher: TeacherRecord = {
      id: `t-${Date.now()}`,
      name,
      email,
      department,
      passwordHash: hashPassword(password),
    };
    teachers.push(newTeacher);
    saveTeachers(teachers);

    const token = signToken(newTeacher);
    res.status(201).json({ token, teacher: sanitizeTeacher(newTeacher) });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = extractToken(req);
    const teacher = token ? verifyToken(token) : null;
    if (!teacher) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    res.json({ teacher: sanitizeTeacher(teacher) });
  });

  app.use('/api/state', requireTeacher);
  app.use('/api/students', requireTeacher);
  app.use('/api/attendance', requireTeacher);
  app.use('/api/export', requireTeacher);
  app.use('/api/import', requireTeacher);
  app.use('/api/sample-data', requireTeacher);
  app.use('/api/clear-data', requireTeacher);

  app.get('/api/state', (_req, res) => {
    res.json(buildStateResponse());
  });

  app.post('/api/students', (req, res) => {
    const rawRoll = req.body?.rollNo;
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    const rollNo = Number(rawRoll);
    if (!Number.isInteger(rollNo) || rollNo <= 0) {
      res.status(400).json({ error: 'Roll number must be a positive integer.' });
      return;
    }

    if (!rawName || rawName.includes(',')) {
      res.status(400).json({ error: 'Enter a valid student name without commas.' });
      return;
    }

    const students = loadStudents();
    if (students.some((s) => s.rollNo === rollNo)) {
      res.status(409).json({ error: `Student with Roll Number ${rollNo} already exists.` });
      return;
    }

    students.push({ rollNo, name: rawName });
    saveStudents(students);
    res.status(201).json(buildStateResponse());
  });

  app.delete('/api/students/:rollNo', (req, res) => {
    const rollNo = Number(req.params.rollNo);
    if (!Number.isInteger(rollNo) || rollNo <= 0) {
      res.status(400).json({ error: 'Invalid roll number.' });
      return;
    }

    const students = loadStudents();
    if (!students.some((s) => s.rollNo === rollNo)) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const nextStudents = students.filter((s) => s.rollNo !== rollNo);
    const nextRecords = loadAttendance().filter((r) => r.rollNo !== rollNo);
    saveStudents(nextStudents);
    saveAttendance(nextRecords);
    res.json(buildStateResponse());
  });

  app.post('/api/attendance', (req, res) => {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

    const students = loadStudents();
    if (students.length === 0) {
      res.status(400).json({ error: 'Register students first before marking attendance.' });
      return;
    }

    if (!isValidIsoDate(date)) {
      res.status(400).json({ error: 'Enter a valid date in YYYY-MM-DD format.' });
      return;
    }

    if (!subject || subject.includes(',')) {
      res.status(400).json({ error: 'Enter a valid subject name without commas.' });
      return;
    }

    const records = loadAttendance();
    const alreadyMarked = records.some(
      (r) => r.date === date && r.subject.toLowerCase() === subject.toLowerCase()
    );
    if (alreadyMarked) {
      res.status(409).json({
        error: `Attendance already marked for ${subject} on ${date}. Use Correct Attendance to modify records.`,
      });
      return;
    }

    const statusByRoll = new Map<number, 'P' | 'A'>();
    for (const item of entries) {
      const roll = Number(item?.rollNo);
      const st = typeof item?.status === 'string' ? item.status.trim().toUpperCase() : '';
      if (Number.isInteger(roll) && (st === 'P' || st === 'A')) {
        statusByRoll.set(roll, st);
      }
    }

    const newRecords: AttendanceRecord[] = [];
    for (const student of students) {
      const status = statusByRoll.get(student.rollNo);
      if (!status) {
        res.status(400).json({
          error: `Missing valid status (P or A) for ${student.rollNo} - ${student.name}.`,
        });
        return;
      }
      newRecords.push({
        date,
        subject,
        rollNo: student.rollNo,
        status,
      });
    }

    records.push(...newRecords);
    saveAttendance(records);
    res.status(201).json(buildStateResponse());
  });

  app.put('/api/attendance', (req, res) => {
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

    const students = loadStudents();
    if (students.length === 0) {
      res.status(400).json({ error: 'Register students first before marking attendance.' });
      return;
    }

    if (!isValidIsoDate(date)) {
      res.status(400).json({ error: 'Enter a valid date in YYYY-MM-DD format.' });
      return;
    }

    if (!subject || subject.includes(',')) {
      res.status(400).json({ error: 'Enter a valid subject name without commas.' });
      return;
    }

    const statusByRoll = new Map<number, 'P' | 'A'>();
    for (const item of entries) {
      const roll = Number(item?.rollNo);
      const st = typeof item?.status === 'string' ? item.status.trim().toUpperCase() : '';
      if (Number.isInteger(roll) && (st === 'P' || st === 'A')) {
        statusByRoll.set(roll, st);
      }
    }

    const updatedSessionRecords: AttendanceRecord[] = [];
    for (const student of students) {
      const status = statusByRoll.get(student.rollNo);
      if (!status) {
        res.status(400).json({
          error: `Missing valid status (P or A) for ${student.rollNo} - ${student.name}.`,
        });
        return;
      }
      updatedSessionRecords.push({
        date,
        subject,
        rollNo: student.rollNo,
        status,
      });
    }

    const remainingRecords = loadAttendance().filter(
      (r) => !(r.date === date && r.subject.toLowerCase() === subject.toLowerCase())
    );
    saveAttendance([...remainingRecords, ...updatedSessionRecords]);
    res.json(buildStateResponse());
  });

  app.patch('/api/attendance', (req, res) => {
    const rollNo = Number(req.body?.rollNo);
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';

    if (!Number.isInteger(rollNo) || rollNo <= 0) {
      res.status(400).json({ error: 'Enter a valid roll number.' });
      return;
    }

    if (!subject) {
      res.status(400).json({ error: 'Enter a valid subject.' });
      return;
    }

    if (!isValidIsoDate(date)) {
      res.status(400).json({ error: 'Enter a valid date in YYYY-MM-DD format.' });
      return;
    }

    if (status !== 'P' && status !== 'A') {
      res.status(400).json({ error: 'Status must be P or A.' });
      return;
    }

    const records = loadAttendance();
    const target = records.find(
      (r) => r.rollNo === rollNo && r.subject.toLowerCase() === subject.toLowerCase() && r.date === date
    );

    if (!target) {
      res.status(404).json({ error: 'Attendance record not found!' });
      return;
    }

    target.status = status;
    saveAttendance(records);
    res.json(buildStateResponse());
  });

  app.get('/api/export/students.csv', (_req, res) => {
    ensureDataDir();
    const students = loadStudents();
    const csv = students.map((s) => `${s.rollNo},${s.name}`).join('\n') + (students.length > 0 ? '\n' : '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  });

  app.get('/api/export/attendance.csv', (_req, res) => {
    ensureDataDir();
    const records = loadAttendance();
    const csv =
      records.map((r) => `${r.date},${r.subject},${r.rollNo},${r.status}`).join('\n') +
      (records.length > 0 ? '\n' : '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    res.send(csv);
  });

  app.post('/api/import/students', (req, res) => {
    const csvText: string = typeof req.body?.csv === 'string' ? req.body.csv : '';
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    const existing = loadStudents();
    const map = new Map<number, Student>(existing.map((s) => [s.rollNo, s]));
    let added = 0;

    for (const line of lines) {
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) continue;
      const rollNo = Number(line.slice(0, commaIdx).trim());
      const name = line.slice(commaIdx + 1).trim();
      if (Number.isInteger(rollNo) && rollNo > 0 && name && !name.includes(',')) {
        if (!map.has(rollNo)) added++;
        map.set(rollNo, { rollNo, name });
      }
    }

    if (map.size === existing.length && added === 0 && lines.length > 0) {
      res.status(400).json({ error: 'No valid student rows found. Expected format: rollNo,name' });
      return;
    }

    saveStudents(Array.from(map.values()));
    res.json(buildStateResponse());
  });

  app.post('/api/import/attendance', (req, res) => {
    const csvText: string = typeof req.body?.csv === 'string' ? req.body.csv : '';
    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    const records = loadAttendance();
    let importedCount = 0;

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 4) continue;
      const date = parts[0].trim();
      const subject = parts[1].trim();
      const rollNo = Number(parts[2].trim());
      const status = parts[3].trim().toUpperCase();
      if (isValidIsoDate(date) && subject && Number.isInteger(rollNo) && rollNo > 0 && (status === 'P' || status === 'A')) {
        const idx = records.findIndex(
          (r) => r.date === date && r.subject.toLowerCase() === subject.toLowerCase() && r.rollNo === rollNo
        );
        if (idx >= 0) {
          records[idx].status = status;
        } else {
          records.push({ date, subject, rollNo, status });
        }
        importedCount++;
      }
    }

    if (importedCount === 0 && lines.length > 0) {
      res.status(400).json({ error: 'No valid attendance rows found. Expected format: YYYY-MM-DD,subject,rollNo,P|A' });
      return;
    }

    saveAttendance(records);
    res.json(buildStateResponse());
  });

  app.post('/api/sample-data', (_req, res) => {
    const sample = getSampleData();
    saveStudents(sample.students);
    saveAttendance(sample.records);
    res.json(buildStateResponse());
  });

  app.post('/api/clear-data', (_req, res) => {
    saveStudents([]);
    saveAttendance([]);
    res.json(buildStateResponse());
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Student Attendance Ledger running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
