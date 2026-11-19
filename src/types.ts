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

export interface LedgerState {
  students: Student[];
  records: AttendanceRecord[];
  subjects: string[];
  dates: string[];
}

export type ViewTab =
  | 'overview'
  | 'mark'
  | 'students'
  | 'subject'
  | 'shortage'
  | 'date'
  | 'correct';

export interface OverallStudentRow {
  rollNo: number;
  name: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  statusLabel: 'Eligible' | 'Shortage' | 'No Attendance Records';
}

export interface CorrectionPrefill {
  rollNo: number;
  subject: string;
  date: string;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  department: string;
}

