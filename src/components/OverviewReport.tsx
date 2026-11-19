import { AlertCircle, CheckCircle2, MinusCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AttendanceRecord, Student, ViewTab } from '../types';
import { computeOverallRows, countUniqueSessions } from '../utils/attendance';

interface OverviewReportProps {
  students: Student[];
  records: AttendanceRecord[];
  subjects: string[];
  onNavigate: (tab: ViewTab) => void;
  onInspectStudentSubject: (rollNo: number) => void;
}

type StatusFilter = 'all' | 'eligible' | 'shortage' | 'none';

export function OverviewReport({
  students,
  records,
  subjects,
  onNavigate,
  onInspectStudentSubject,
}: OverviewReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const rows = useMemo(() => computeOverallRows(students, records), [students, records]);

  const totalClassesRecorded = useMemo(() => countUniqueSessions(records), [records]);
  const shortageCount = useMemo(
    () => rows.filter((r) => r.statusLabel === 'Shortage').length,
    [rows]
  );
  const eligibleCount = useMemo(
    () => rows.filter((r) => r.statusLabel === 'Eligible').length,
    [rows]
  );

  const cohortAverage = useMemo(() => {
    if (records.length === 0) return 0;
    const presentTotal = records.filter((r) => r.status === 'P').length;
    return (presentTotal * 100.0) / records.length;
  }, [records]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'eligible' && row.statusLabel !== 'Eligible') return false;
      if (statusFilter === 'shortage' && row.statusLabel !== 'Shortage') return false;
      if (statusFilter === 'none' && row.statusLabel !== 'No Attendance Records') return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) || String(row.rollNo).includes(q)
      );
    });
  }, [rows, searchQuery, statusFilter]);

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          No students registered yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Add students to the roster first to begin marking attendance and generating eligibility reports.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            Add First Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4-column summary metric strip */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Registered Students</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {students.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {eligibleCount} eligible · {shortageCount} shortage
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Class Sessions</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalClassesRecorded}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Cohort Attendance</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {records.length === 0 ? '0.00%' : `${cohortAverage.toFixed(2)}%`}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            75.00% minimum threshold
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Attendance Shortage</div>
          <div
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              shortageCount > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {shortageCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {shortageCount > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('shortage')}
                className="font-medium text-blue-700 hover:underline"
              >
                View shortage report
              </button>
            ) : (
              'All active students eligible'
            )}
          </div>
        </div>
      </div>

      {/* Overall Report Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Overall Attendance Report
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Eligibility requires 75.00% or higher cumulative attendance across all recorded sessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/*
              Unit 3 — Delegation Event Model (Browser DOM <-> Java AWT/Swing analogy):
              1. Event Source: <input> / <button> element dispatching the interaction.
              2. Event Object: Synthetic ChangeEvent / KeyboardEvent / MouseEvent carrying target value & key.
              3. Event Listener: onChange, onKeyPress/onKeyDown, and onClick callbacks registered below.
            */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="Search roll or name..."
                aria-label="Search students by roll number or name"
                className="h-9 w-52 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1" role="group" aria-label="Filter by eligibility">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'eligible', label: 'Eligible' },
                  { id: 'shortage', label: 'Shortage' },
                  { id: 'none', label: 'No Records' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Roll Number</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3 text-right">Total Classes</th>
                <th className="px-5 py-3 text-right">Attended</th>
                <th className="px-5 py-3 text-right">Attendance %</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Subject Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                    No students match your current search or filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.rollNo}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                      {row.rollNo}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {row.total}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {row.present}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                      <div className="flex items-center justify-end gap-3">
                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block">
                          <div
                            className={`h-full ${
                              row.total === 0
                                ? 'bg-slate-300'
                                : row.percentage >= 75
                                  ? 'bg-emerald-600'
                                  : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                          />
                        </div>
                        <span>{row.percentage.toFixed(2)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {row.statusLabel === 'Eligible' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Eligible</span>
                        </span>
                      )}
                      {row.statusLabel === 'Shortage' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Shortage</span>
                        </span>
                      )}
                      {row.statusLabel === 'No Attendance Records' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <MinusCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>No Attendance Records</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectStudentSubject(row.rollNo)}
                        className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Inspect Subjects
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
