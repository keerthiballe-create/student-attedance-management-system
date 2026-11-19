import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AttendanceRecord, CorrectionPrefill, Student } from '../types';
import { getTodayIsoDate } from '../utils/attendance';

interface DateReportViewProps {
  students: Student[];
  records: AttendanceRecord[];
  dates: string[];
  onJumpToCorrect: (prefill: CorrectionPrefill) => void;
}

export function DateReportView({
  students,
  records,
  dates,
  onJumpToCorrect,
}: DateReportViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => dates[0] ?? getTodayIsoDate());
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate) && records.every((r) => r.date !== selectedDate)) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate, records]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.rollNo, s.name])),
    [students]
  );

  const dateRecords = useMemo(() => {
    return records
      .filter((r) => r.date === selectedDate)
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.rollNo - b.rollNo);
  }, [records, selectedDate]);

  const subjectsOnDate = useMemo(
    () => Array.from(new Set(dateRecords.map((r) => r.subject))).sort((a, b) => a.localeCompare(b)),
    [dateRecords]
  );

  const visibleRecords = useMemo(() => {
    if (subjectFilter === 'all') return dateRecords;
    return dateRecords.filter((r) => r.subject === subjectFilter);
  }, [dateRecords, subjectFilter]);

  const presentCount = useMemo(
    () => visibleRecords.filter((r) => r.status === 'P').length,
    [visibleRecords]
  );
  const absentCount = visibleRecords.length - presentCount;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Date-wise Attendance Report
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Inspect every roll-call entry recorded on a given calendar date (YYYY-MM-DD).
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-xs">
            <label htmlFor="date-report-input" className="block text-xs font-medium text-slate-700">
              Select Date (YYYY-MM-DD)
            </label>
            <input
              id="date-report-input"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSubjectFilter('all');
              }}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          {dates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">Recorded dates:</span>
              {dates.slice(0, 8).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d);
                    setSubjectFilter('all');
                  }}
                  className={`rounded border px-2.5 py-1 font-mono text-xs transition-colors whitespace-nowrap ${
                    selectedDate === d
                      ? 'border-blue-700 bg-blue-50 font-medium text-blue-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
            <span className="font-mono font-semibold text-slate-900">{selectedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{visibleRecords.length} records</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-emerald-700">{presentCount} Present</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-red-600">{absentCount} Absent</span>
          </div>

          {subjectsOnDate.length > 1 && (
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1" role="group" aria-label="Filter by subject">
              <button
                type="button"
                onClick={() => setSubjectFilter('all')}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  subjectFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Subjects
              </button>
              {subjectsOnDate.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubjectFilter(sub)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    subjectFilter === sub
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 w-32">Roll Number</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    No records found for this date.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((rec) => (
                  <tr
                    key={`${rec.date}-${rec.subject}-${rec.rollNo}`}
                    className="hover:bg-slate-50/70"
                  >
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
                          <span>P (Present)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>A (Absent)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onJumpToCorrect({
                            rollNo: rec.rollNo,
                            subject: rec.subject,
                            date: rec.date,
                          })
                        }
                        className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Correct
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
