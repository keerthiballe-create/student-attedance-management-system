import { AttendanceRecord, OverallStudentRow, Student } from '../types';

export function computeOverallRows(
  students: Student[],
  records: AttendanceRecord[]
): OverallStudentRow[] {
  return students.map((student) => {
    let total = 0;
    let present = 0;
    for (const r of records) {
      if (r.rollNo === student.rollNo) {
        total++;
        if (r.status === 'P') {
          present++;
        }
      }
    }
    const absent = total - present;
    const percentage = total === 0 ? 0 : (present * 100.0) / total;
    let statusLabel: OverallStudentRow['statusLabel'] = 'No Attendance Records';
    if (total > 0) {
      statusLabel = percentage >= 75 ? 'Eligible' : 'Shortage';
    }
    return {
      rollNo: student.rollNo,
      name: student.name,
      total,
      present,
      absent,
      percentage,
      statusLabel,
    };
  });
}

export function classesNeededFor75(present: number, total: number): number {
  if (total === 0 || (present * 100.0) / total >= 75) {
    return 0;
  }
  // Solve (present + x) / (total + x) >= 0.75  =>  x >= 3*total - 4*present
  const needed = 3 * total - 4 * present;
  return Math.max(0, Math.ceil(needed));
}

export function isValidIsoDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function countUniqueSessions(records: AttendanceRecord[]): number {
  const keys = new Set<string>();
  for (const r of records) {
    keys.add(`${r.date}__${r.subject.toLowerCase()}`);
  }
  return keys.size;
}
