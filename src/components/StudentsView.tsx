import { AlertCircle, CheckCircle2, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AttendanceRecord, Student } from '../types';
import { computeOverallRows } from '../utils/attendance';

interface StudentsViewProps {
  students: Student[];
  records: AttendanceRecord[];
  onAddStudent: (rollNo: number, name: string) => Promise<void>;
  onDeleteStudent: (rollNo: number) => Promise<void>;
  onImportStudentsCsv: (csvText: string) => Promise<void>;
  onImportAttendanceCsv: (csvText: string) => Promise<void>;
  onLoadSampleData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export function StudentsView({
  students,
  records,
  onAddStudent,
  onDeleteStudent,
  onImportStudentsCsv,
  onImportAttendanceCsv,
  onLoadSampleData,
  onClearAllData,
}: StudentsViewProps) {
  const [rollInput, setRollInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const studentFileRef = useRef<HTMLInputElement>(null);
  const attendanceFileRef = useRef<HTMLInputElement>(null);

  const overallMap = useMemo(() => {
    const rows = computeOverallRows(students, records);
    return new Map(rows.map((r) => [r.rollNo, r]));
  }, [students, records]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.rollNo).includes(q)
    );
  }, [students, searchQuery]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedRoll = Number(rollInput.trim());
    const trimmedName = nameInput.trim();

    if (!Number.isInteger(parsedRoll) || parsedRoll <= 0) {
      setErrorMsg('Roll number must be a positive integer!');
      return;
    }
    if (students.some((s) => s.rollNo === parsedRoll)) {
      setErrorMsg('Student already exists!');
      return;
    }
    if (!trimmedName || trimmedName.includes(',')) {
      setErrorMsg('Enter a valid name without commas!');
      return;
    }

    setSubmitting(true);
    try {
      await onAddStudent(parsedRoll, trimmedName);
      setSuccessMsg(`Student ${parsedRoll} - ${trimmedName} added successfully!`);
      setRollInput('');
      setNameInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    kind: 'students' | 'attendance'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const text = await file.text();
      if (kind === 'students') {
        await onImportStudentsCsv(text);
        setSuccessMsg('Imported students CSV successfully.');
      } else {
        await onImportAttendanceCsv(text);
        setSuccessMsg('Imported attendance CSV successfully.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV import failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Student Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <div className="border-b border-slate-200 pb-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Add Student
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Register a student with a unique positive roll number and full name (no commas).
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-3">
            <label htmlFor="student-roll" className="block text-xs font-medium text-slate-700">
              Roll Number
            </label>
            <input
              id="student-roll"
              type="number"
              min={1}
              step={1}
              value={rollInput}
              onChange={(e) => {
                setRollInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. 111"
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="student-name" className="block text-xs font-medium text-slate-700">
              Student Name
            </label>
            <input
              id="student-name"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. Priya Deshmukh"
              required
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              <span>{submitting ? 'Adding...' : 'Add Student'}</span>
            </button>
          </div>
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

      {/* Display Students Table */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Registered Students
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
              {students.length} {students.length === 1 ? 'student' : 'students'} stored in students.csv
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                aria-label="Search registered students"
                className="h-9 w-48 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <input
              ref={studentFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'students')}
            />
            <button
              type="button"
              onClick={() => studentFileRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5 text-slate-400" />
              <span>Import students.csv</span>
            </button>

            <input
              ref={attendanceFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e, 'attendance')}
            />
            <button
              type="button"
              onClick={() => attendanceFileRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5 text-slate-400" />
              <span>Import attendance.csv</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="px-5 py-3 w-32">Roll Number</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3 text-right">Classes Recorded</th>
                <th className="px-5 py-3 text-right">Overall %</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    {students.length === 0
                      ? 'No students registered! Add a student above or load sample data.'
                      : 'No students match your search.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const summary = overallMap.get(student.rollNo);
                  return (
                    <tr key={student.rollNo} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {student.rollNo}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {student.name}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                        {summary ? `${summary.present} / ${summary.total}` : '0 / 0'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {summary ? `${summary.percentage.toFixed(2)}%` : '0.00%'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student.rollNo)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 whitespace-nowrap"
                          aria-label={`Remove ${student.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
          <span className="text-xs text-slate-500">
            Dataset utilities
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                onLoadSampleData().then(() => setSuccessMsg('Sample class roster and attendance restored.'));
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Load Sample Class
            </button>
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap shrink-0"
              >
                Clear All Data
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    setErrorMsg(null);
                    onClearAllData().then(() => setSuccessMsg('All students and attendance records cleared.'));
                  }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
