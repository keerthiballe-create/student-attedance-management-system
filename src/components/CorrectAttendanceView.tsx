import { AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AttendanceRecord, CorrectionPrefill, Student } from '../types';
import { getTodayIsoDate, isValidIsoDateString } from '../utils/attendance';

interface CorrectAttendanceViewProps {
  students: Student[];
  records: AttendanceRecord[];
  subjects: string[];
  prefill: CorrectionPrefill | null;
  onCorrectAttendance: (payload: {
    rollNo: number;
    subject: string;
    date: string;
    status: 'P' | 'A';
  }) => Promise<void>;
}

export function CorrectAttendanceView({
  students,
  records,
  subjects,
  prefill,
  onCorrectAttendance,
}: CorrectAttendanceViewProps) {
  const [rollInput, setRollInput] = useState<string>(() =>
    prefill ? String(prefill.rollNo) : students[0] ? String(students[0].rollNo) : ''
  );
  const [subjectInput, setSubjectInput] = useState<string>(
    prefill?.subject ?? subjects[0] ?? ''
  );
  const [dateInput, setDateInput] = useState<string>(
    prefill?.date ?? records[0]?.date ?? getTodayIsoDate()
  );
  const [newStatus, setNewStatus] = useState<'P' | 'A'>('P');
  const [logSearch, setLogSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      setRollInput(String(prefill.rollNo));
      setSubjectInput(prefill.subject);
      setDateInput(prefill.date);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [prefill]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.rollNo, s.name])),
    [students]
  );

  const parsedRoll = Number(rollInput.trim());
  const trimmedSubject = subjectInput.trim();

  const matchedRecord = useMemo(() => {
    if (!Number.isInteger(parsedRoll) || parsedRoll <= 0 || !trimmedSubject || !isValidIsoDateString(dateInput)) {
      return null;
    }
    return (
      records.find(
        (r) =>
          r.rollNo === parsedRoll &&
          r.subject.toLowerCase() === trimmedSubject.toLowerCase() &&
          r.date === dateInput
      ) ?? null
    );
  }, [records, parsedRoll, trimmedSubject, dateInput]);

  useEffect(() => {
    if (matchedRecord) {
      setNewStatus(matchedRecord.status === 'P' ? 'A' : 'P');
    }
  }, [matchedRecord]);

  const recentRecords = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return [...records]
      .sort((a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject) || a.rollNo - b.rollNo)
      .filter((r) => {
        if (!q) return true;
        const name = studentMap.get(r.rollNo)?.toLowerCase() ?? '';
        return (
          String(r.rollNo).includes(q) ||
          name.includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.date.includes(q)
        );
      })
      .slice(0, 40);
  }, [records, logSearch, studentMap]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!Number.isInteger(parsedRoll) || parsedRoll <= 0) {
      setErrorMsg('Enter a valid positive Roll Number.');
      return;
    }
    if (!trimmedSubject) {
      setErrorMsg('Enter a valid subject.');
      return;
    }
    if (!isValidIsoDateString(dateInput)) {
      setErrorMsg('Invalid date! Enter YYYY-MM-DD.');
      return;
    }
    if (!matchedRecord) {
      setErrorMsg('Attendance record not found!');
      return;
    }

    setSubmitting(true);
    try {
      await onCorrectAttendance({
        rollNo: parsedRoll,
        subject: trimmedSubject,
        date: dateInput,
        status: newStatus,
      });
      setSuccessMsg(
        `Attendance corrected for Roll ${parsedRoll} (${matchedRecord.subject} · ${dateInput}) to ${newStatus}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to correct attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Correct Attendance Record
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Look up a record by Roll Number, Subject, and Date to update its status between Present (P) and Absent (A).
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="corr-roll" className="block text-xs font-medium text-slate-700">
              Roll Number
            </label>
            <input
              id="corr-roll"
              type="number"
              min={1}
              step={1}
              value={rollInput}
              onChange={(e) => {
                setRollInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. 103"
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="corr-subject" className="block text-xs font-medium text-slate-700">
              Subject
            </label>
            <input
              id="corr-subject"
              type="text"
              value={subjectInput}
              onChange={(e) => {
                setSubjectInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. Data Structures"
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="corr-date" className="block text-xs font-medium text-slate-700">
              Date (YYYY-MM-DD)
            </label>
            <input
              id="corr-date"
              type="date"
              value={dateInput}
              onChange={(e) => {
                setDateInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-4 rounded-md border border-slate-200 bg-slate-50/70 px-4 py-3.5 sm:flex-row sm:items-center">
          {matchedRecord ? (
            <>
              <div className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {studentMap.get(matchedRecord.rollNo) ?? `Roll ${matchedRecord.rollNo}`}
                </span>
                <span className="mx-2 text-slate-400">·</span>
                <span>Current Status: </span>
                <span
                  className={`font-mono font-semibold ${
                    matchedRecord.status === 'P' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {matchedRecord.status} ({matchedRecord.status === 'P' ? 'Present' : 'Absent'})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-md bg-slate-200/70 p-1" role="group" aria-label="New Attendance Status">
                  <button
                    type="button"
                    onClick={() => setNewStatus('P')}
                    className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      newStatus === 'P'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    New: Present (P)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('A')}
                    className={`rounded px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      newStatus === 'A'
                        ? 'bg-red-600 text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    New: Absent (A)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Updating...' : 'Apply Correction'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
              <span>
                Attendance record not found for that Roll Number, Subject, and Date. Click any row below to load it.
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </form>

      {/* Clickable Attendance Records Log */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Attendance Log
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Click any entry to load it into the correction form above.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter roll, name, subject..."
              aria-label="Filter attendance log"
              className="h-9 w-56 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Roll Number</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                recentRecords.map((rec) => {
                  const isSelected =
                    matchedRecord?.date === rec.date &&
                    matchedRecord?.rollNo === rec.rollNo &&
                    matchedRecord?.subject.toLowerCase() === rec.subject.toLowerCase();
                  return (
                    <tr
                      key={`${rec.date}-${rec.subject}-${rec.rollNo}`}
                      onClick={() => {
                        setRollInput(String(rec.rollNo));
                        setSubjectInput(rec.subject);
                        setDateInput(rec.date);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                        {rec.date}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {rec.rollNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {studentMap.get(rec.rollNo) ?? 'Unknown'}
                      </td>
                      <td className="px-5 py-3 text-slate-700">{rec.subject}</td>
                      <td className="px-5 py-3">
                        {rec.status === 'P' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>P</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>A</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-medium text-blue-700">
                          {isSelected ? 'Loaded' : 'Edit'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
