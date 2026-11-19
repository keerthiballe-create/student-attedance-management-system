import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { classesNeededFor75, computeOverallRows } from '../utils/attendance';

interface ShortageReportViewProps {
  students: Student[];
  records: AttendanceRecord[];
  onInspectStudentSubject: (rollNo: number) => void;
}

export function ShortageReportView({
  students,
  records,
  onInspectStudentSubject,
}: ShortageReportViewProps) {
  const shortageRows = useMemo(() => {
    return computeOverallRows(students, records)
      .filter((row) => row.total > 0 && row.percentage < 75)
      .sort((a, b) => a.percentage - b.percentage);
  }, [students, records]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Attendance Shortage Report (&lt;75%)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Students with recorded classes whose cumulative attendance is strictly below 75.00%.
          </p>
        </div>
        <div className="font-mono text-xs font-medium text-slate-600 tabular-nums">
          {shortageRows.length} {shortageRows.length === 1 ? 'student flagged' : 'students flagged'}
        </div>
      </div>

      {shortageRows.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
            No students have attendance shortage
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Every student with recorded attendance meets or exceeds the 75.00% eligibility requirement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 w-32">Roll Number</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3 text-right">Attended / Total</th>
                <th className="px-5 py-3 text-right">Attendance %</th>
                <th className="px-5 py-3 text-right">Classes to Reach 75%</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shortageRows.map((row) => {
                const needed = classesNeededFor75(row.present, row.total);
                return (
                  <tr key={row.rollNo} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                      {row.rollNo}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {row.present} / {row.total}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-red-600 tabular-nums">
                      {row.percentage.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums">
                      +{needed} consecutive {needed === 1 ? 'class' : 'classes'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Shortage</span>
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
