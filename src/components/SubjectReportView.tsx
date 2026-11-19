import { AlertCircle, CheckCircle2, MinusCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AttendanceRecord, CorrectionPrefill, Student } from '../types';

interface SubjectReportViewProps {
  students: Student[];
  records: AttendanceRecord[];
  subjects: string[];
  initialRollNo?: number | null;
  onJumpToCorrect: (prefill: CorrectionPrefill) => void;
}

type SubjectViewMode = 'student' | 'class';

export function SubjectReportView({
  students,
  records,
  subjects,
  initialRollNo,
  onJumpToCorrect,
}: SubjectReportViewProps) {
  const [viewMode, setViewMode] = useState<SubjectViewMode>('student');
  const [selectedRoll, setSelectedRoll] = useState<string>(() => {
    if (initialRollNo) return String(initialRollNo);
    return students[0] ? String(students[0].rollNo) : '';
  });
  const [subjectInput, setSubjectInput] = useState<string>(() => subjects[0] ?? '');
  const hasInitializedSubjectRef = useRef(Boolean(subjects[0]));

  // Only sync initialRollNo when the parent explicitly updates initialRollNo
  useEffect(() => {
    if (initialRollNo) {
      setSelectedRoll(String(initialRollNo));
      setViewMode('student');
    }
  }, [initialRollNo]);

  // If students list loads asynchronously and no student is selected yet, default to first student
  useEffect(() => {
    if (!selectedRoll && students.length > 0) {
      setSelectedRoll(String(students[0].rollNo));
    }
  }, [students, selectedRoll]);

  // Initialize subjectInput once when subjects first arrive, without snapping back if user clears input
  useEffect(() => {
    if (!hasInitializedSubjectRef.current && subjects.length > 0) {
      setSubjectInput(subjects[0]);
      hasInitializedSubjectRef.current = true;
    }
  }, [subjects]);

  const parsedRoll = Number(selectedRoll.trim());
  const student = useMemo(
    () =>
      Number.isInteger(parsedRoll) && parsedRoll > 0
        ? students.find((s) => s.rollNo === parsedRoll) ?? null
        : null,
    [students, parsedRoll]
  );

  const trimmedSubject = subjectInput.trim();

  // Single-student subject records (matches Java subjectReport)
  const matchingRecords = useMemo(() => {
    if (!student || !trimmedSubject) return [];
    return records
      .filter(
        (r) =>
          r.rollNo === student.rollNo &&
          r.subject.toLowerCase() === trimmedSubject.toLowerCase()
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, student, trimmedSubject]);

  const presentCount = useMemo(
    () => matchingRecords.filter((r) => r.status === 'P').length,
    [matchingRecords]
  );
  const totalCount = matchingRecords.length;
  const percentage = totalCount === 0 ? 0 : (presentCount * 100.0) / totalCount;

  // All subjects breakdown for the selected student
  const allSubjectsForStudent = useMemo(() => {
    if (!student) return [];
    const grouped = new Map<string, { subject: string; total: number; present: number }>();
    for (const r of records) {
      if (r.rollNo !== student.rollNo) continue;
      const key = r.subject.toLowerCase();
      const entry = grouped.get(key) ?? { subject: r.subject, total: 0, present: 0 };
      entry.total++;
      if (r.status === 'P') entry.present++;
      grouped.set(key, entry);
    }
    return Array.from(grouped.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [records, student]);

  // Class-wide subject report across all students for the chosen subject
  const classSubjectRows = useMemo(() => {
    if (!trimmedSubject) return [];
    return students.map((s) => {
      const subRecs = records.filter(
        (r) =>
          r.rollNo === s.rollNo &&
          r.subject.toLowerCase() === trimmedSubject.toLowerCase()
      );
      const total = subRecs.length;
      const present = subRecs.filter((r) => r.status === 'P').length;
      const absent = total - present;
      const pct = total === 0 ? 0 : (present * 100.0) / total;
      return {
        rollNo: s.rollNo,
        name: s.name,
        total,
        present,
        absent,
        percentage: pct,
      };
    });
  }, [students, records, trimmedSubject]);

  const classSubjectTotalEntries = useMemo(
    () => classSubjectRows.reduce((acc, r) => acc + r.total, 0),
    [classSubjectRows]
  );
  const classSubjectPresentEntries = useMemo(
    () => classSubjectRows.reduce((acc, r) => acc + r.present, 0),
    [classSubjectRows]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Subject-wise Attendance Report
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Inspect a specific student&apos;s attendance in a subject or compare the entire class for a subject.
            </p>
          </div>

          <div
            className="flex items-center gap-1 rounded-md bg-slate-100 p-1 self-start sm:self-auto"
            role="group"
            aria-label="Subject report view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('student')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'student'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Student &amp; Subject
            </button>
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'class'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Students by Subject
            </button>
          </div>
        </div>

        <div className={`mt-4 grid grid-cols-1 gap-4 ${viewMode === 'student' ? 'md:grid-cols-12' : ''}`}>
          {viewMode === 'student' && (
            <>
              <div className="md:col-span-4">
                <label htmlFor="sub-roll-select" className="block text-xs font-medium text-slate-700">
                  Student
                </label>
                <select
                  id="sub-roll-select"
                  value={student ? String(student.rollNo) : ''}
                  onChange={(e) => setSelectedRoll(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                >
                  {students.length === 0 ? (
                    <option value="">No students registered</option>
                  ) : (
                    <>
                      {!student && <option value="">Select a student...</option>}
                      {students.map((s) => (
                        <option key={s.rollNo} value={String(s.rollNo)}>
                          {s.rollNo} — {s.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="sub-roll-input" className="block text-xs font-medium text-slate-700">
                  Roll Number
                </label>
                <input
                  id="sub-roll-input"
                  type="number"
                  min={1}
                  step={1}
                  value={selectedRoll}
                  onChange={(e) => setSelectedRoll(e.target.value)}
                  placeholder="Roll #"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className={viewMode === 'student' ? 'md:col-span-6' : ''}>
            <label htmlFor="sub-name" className="block text-xs font-medium text-slate-700">
              Subject
            </label>
            <input
              id="sub-name"
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="Enter subject name..."
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
            {subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500">Subjects:</span>
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectInput(sub)}
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
      </div>

      {viewMode === 'class' ? (
        students.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No students registered! Register students first.
          </div>
        ) : !trimmedSubject ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            Enter or select a subject above to view class-wide attendance.
          </div>
        ) : classSubjectTotalEntries === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No attendance records found for <strong>{trimmedSubject}</strong>.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {trimmedSubject} · Full Class Breakdown
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  Class Average:{' '}
                  {((classSubjectPresentEntries * 100.0) / classSubjectTotalEntries).toFixed(2)}%
                  {' · '}
                  {classSubjectPresentEntries} / {classSubjectTotalEntries} present marks
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 w-32">Roll Number</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3 text-right">Total Classes</th>
                    <th className="px-5 py-3 text-right">Present</th>
                    <th className="px-5 py-3 text-right">Absent</th>
                    <th className="px-5 py-3 text-right">Attendance %</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classSubjectRows.map((row) => (
                    <tr key={row.rollNo} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {row.rollNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-700 tabular-nums">
                        {row.total}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-700 tabular-nums">
                        {row.present}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-red-600 tabular-nums">
                        {row.absent}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {row.percentage.toFixed(2)}%
                      </td>
                      <td className="px-5 py-3">
                        {row.total === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <MinusCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>No Records</span>
                          </span>
                        ) : row.percentage >= 75 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Eligible</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Shortage</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoll(String(row.rollNo));
                            setViewMode('student');
                          }}
                          className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                        >
                          View Sessions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : !student ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Student not found! Select a student or enter a valid Roll Number.
        </div>
      ) : totalCount === 0 ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            No attendance records found for <strong>{student.name}</strong> (Roll{' '}
            <span className="font-mono">{student.rollNo}</span>) in{' '}
            <strong>{trimmedSubject || 'selected subject'}</strong>.
          </div>

          {allSubjectsForStudent.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Available Subjects for {student.name}
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {allSubjectsForStudent.map((item) => {
                  const pct = (item.present * 100.0) / item.total;
                  return (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() => setSubjectInput(item.subject)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.subject}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                          {item.present} / {item.total} classes
                        </div>
                      </div>
                      <div
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          pct >= 75 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {pct.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Exact Java Subject-wise Report Summary */}
          <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="px-5 py-4">
              <div className="text-xs font-medium text-slate-500">Student</div>
              <div className="mt-1 text-base font-semibold text-slate-900 truncate">
                {student.name}
              </div>
              <div className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Roll No. {student.rollNo} · {matchingRecords[0]?.subject ?? trimmedSubject}
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs font-medium text-slate-500">Total Classes</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {totalCount}
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                Recorded sessions
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs font-medium text-slate-500">Present</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                {presentCount}
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {totalCount - presentCount} absent
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs font-medium text-slate-500">Attendance %</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {percentage.toFixed(2)}%
              </div>
              <div className="mt-1">
                {percentage >= 75 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Eligible</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Shortage (&lt;75%)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Session History for this Student & Subject */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Session History · {matchingRecords[0]?.subject ?? trimmedSubject}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Subject</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Correction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matchingRecords.map((rec) => (
                      <tr key={`${rec.date}-${rec.subject}`} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                          {rec.date}
                        </td>
                        <td className="px-5 py-3 text-slate-900">{rec.subject}</td>
                        <td className="px-5 py-3">
                          {rec.status === 'P' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Present (P)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Absent (A)</span>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All Subjects Breakdown for Selected Student */}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  All Subjects for {student.name}
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {allSubjectsForStudent.map((item) => {
                  const pct = (item.present * 100.0) / item.total;
                  const active = item.subject.toLowerCase() === trimmedSubject.toLowerCase();
                  return (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() => setSubjectInput(item.subject)}
                      className={`flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                        active ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {item.subject}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                          {item.present} / {item.total} classes
                        </div>
                      </div>
                      <div
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          pct >= 75 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {pct.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
