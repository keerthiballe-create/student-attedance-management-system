import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AttendanceRecord, Student, ViewTab } from '../types';
import { getTodayIsoDate, isValidIsoDateString } from '../utils/attendance';

interface MarkAttendanceViewProps {
  students: Student[];
  records: AttendanceRecord[];
  subjects: string[];
  onSubmitAttendance: (payload: {
    date: string;
    subject: string;
    entries: Array<{ rollNo: number; status: 'P' | 'A' }>;
  }) => Promise<void>;
  onUpdateAttendance: (payload: {
    date: string;
    subject: string;
    entries: Array<{ rollNo: number; status: 'P' | 'A' }>;
  }) => Promise<void>;
  onNavigate: (tab: ViewTab) => void;
}

export function MarkAttendanceView({
  students,
  records,
  subjects,
  onSubmitAttendance,
  onUpdateAttendance,
  onNavigate,
}: MarkAttendanceViewProps) {
  const initialDate = getTodayIsoDate();
  const [date, setDate] = useState(initialDate);
  const [subject, setSubject] = useState(() => {
    const unmarked = subjects.find(
      (sub) =>
        !records.some(
          (r) => r.date === initialDate && r.subject.toLowerCase() === sub.toLowerCase()
        )
    );
    return unmarked ?? subjects[0] ?? '';
  });
  const [statusMap, setStatusMap] = useState<Record<number, 'P' | 'A'>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatusMap((prev) => {
      const next: Record<number, 'P' | 'A'> = {};
      for (const s of students) {
        next[s.rollNo] = prev[s.rollNo] ?? 'P';
      }
      return next;
    });
  }, [students]);

  const trimmedSubject = subject.trim();
  const isDuplicateSession = useMemo(() => {
    if (!trimmedSubject || !isValidIsoDateString(date)) return false;
    return records.some(
      (r) => r.date === date && r.subject.toLowerCase() === trimmedSubject.toLowerCase()
    );
  }, [records, date, trimmedSubject]);

  const presentCount = useMemo(
    () => students.filter((s) => (statusMap[s.rollNo] ?? 'P') === 'P').length,
    [students, statusMap]
  );
  const absentCount = students.length - presentCount;

  const setAll = (status: 'P' | 'A') => {
    const next: Record<number, 'P' | 'A'> = {};
    for (const s of students) {
      next[s.rollNo] = status;
    }
    setStatusMap(next);
  };

  const buildEntries = () =>
    students.map((s) => ({
      rollNo: s.rollNo,
      status: statusMap[s.rollNo] ?? 'P',
    }));

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (students.length === 0) {
      setErrorMsg('Register students first!');
      return;
    }
    if (!isValidIsoDateString(date)) {
      setErrorMsg('Invalid date! Enter a valid YYYY-MM-DD date.');
      return;
    }
    if (!trimmedSubject || trimmedSubject.includes(',')) {
      setErrorMsg('Enter a valid subject name without commas!');
      subjectInputRef.current?.focus();
      return;
    }
    if (isDuplicateSession) {
      setErrorMsg(
        `Attendance already marked for ${trimmedSubject} on ${date}. Click "Update Existing Session" to overwrite or choose another subject/date.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitAttendance({
        date,
        subject: trimmedSubject,
        entries: buildEntries(),
      });
      setSuccessMsg(`Attendance saved successfully for ${trimmedSubject} on ${date}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExisting = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isValidIsoDateString(date)) {
      setErrorMsg('Invalid date! Enter a valid YYYY-MM-DD date.');
      return;
    }
    if (!trimmedSubject || trimmedSubject.includes(',')) {
      setErrorMsg('Enter a valid subject name without commas!');
      subjectInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onUpdateAttendance({
        date,
        subject: trimmedSubject,
        entries: buildEntries(),
      });
      setSuccessMsg(`Attendance updated for ${trimmedSubject} on ${date}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Register students first
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          No students are enrolled yet. Add students before marking class attendance.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            Go to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Session Details
          </h2>
          <p className="text-xs text-slate-500">
            Select the class date and subject, then mark each student Present (P) or Absent (A).
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="mark-date" className="block text-xs font-medium text-slate-700">
              Date (YYYY-MM-DD)
            </label>
            <input
              id="mark-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="mark-subject" className="block text-xs font-medium text-slate-700">
              Subject
            </label>
            <input
              ref={subjectInputRef}
              id="mark-subject"
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. Data Structures"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
            {subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500">Quick select:</span>
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSubject(sub);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      trimmedSubject.toLowerCase() === sub.toLowerCase()
                        ? 'border-blue-700 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isDuplicateSession && !successMsg && (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
              <span>
                Attendance is already recorded for <strong>{trimmedSubject}</strong> on{' '}
                <span className="font-mono">{date}</span>. You can update it below or use Correct Attendance.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('correct')}
              className="text-xs font-semibold text-amber-900 underline hover:text-amber-950 whitespace-nowrap shrink-0"
            >
              Open Correct Attendance
            </button>
          </div>
        )}
      </div>

      {/* Roll-call Roster */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
            <span className="font-display text-sm font-semibold text-slate-900">
              Roll Call Sheet
            </span>
            <span aria-hidden="true">·</span>
            <span>{students.length} students</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-emerald-700">{presentCount} Present</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-red-600">{absentCount} Absent</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAll('P')}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => setAll('A')}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 w-32">Roll Number</th>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3 text-right">Status (P / A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((student) => {
                const current = statusMap[student.rollNo] ?? 'P';
                return (
                  <tr key={student.rollNo} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                      {student.rollNo}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 p-1"
                        role="group"
                        aria-label={`Attendance status for ${student.name}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setStatusMap((prev) => ({ ...prev, [student.rollNo]: 'P' }))
                          }
                          className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            current === 'P'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Present (P)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStatusMap((prev) => ({ ...prev, [student.rollNo]: 'A' }))
                          }
                          className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            current === 'A'
                              ? 'bg-red-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Absent (A)
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-5 py-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex flex-col justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="text-xs font-semibold text-emerald-900 underline hover:text-emerald-950 whitespace-nowrap shrink-0"
              >
                View Overall Report
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {isDuplicateSession && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleUpdateExisting}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {submitting ? 'Updating...' : 'Update Existing Session'}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
