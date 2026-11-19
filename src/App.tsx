import { Menu } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CorrectAttendanceView } from './components/CorrectAttendanceView';
import { DateReportView } from './components/DateReportView';
import { LoginPage } from './components/LoginPage';
import { MarkAttendanceView } from './components/MarkAttendanceView';
import { OverviewReport } from './components/OverviewReport';
import { ShortageReportView } from './components/ShortageReportView';
import { Sidebar } from './components/Sidebar';
import { StudentsView } from './components/StudentsView';
import { SubjectReportView } from './components/SubjectReportView';
import { CorrectionPrefill, LedgerState, TeacherUser, ViewTab } from './types';
import { computeOverallRows } from './utils/attendance';

const TOKEN_STORAGE_KEY = 'attendance_teacher_token';

const VIEW_TITLES: Record<ViewTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overall Attendance Report',
    subtitle: 'Cumulative attendance percentages and 75% eligibility standing',
  },
  mark: {
    title: 'Mark Attendance',
    subtitle: 'Record Present (P) or Absent (A) for a date and subject',
  },
  students: {
    title: 'Students & CSV Storage',
    subtitle: 'Register students and manage students.csv / attendance.csv',
  },
  subject: {
    title: 'Subject-wise Report',
    subtitle: 'Inspect attendance breakdown for a student or class by subject',
  },
  shortage: {
    title: 'Attendance Shortage Report',
    subtitle: 'Students currently below the 75.00% minimum threshold',
  },
  date: {
    title: 'Date-wise Report',
    subtitle: 'View all roll-call entries logged on a specific date',
  },
  correct: {
    title: 'Correct Attendance',
    subtitle: 'Look up and update an existing Present or Absent record',
  },
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [ledger, setLedger] = useState<LedgerState>({
    students: [],
    records: [],
    subjects: [],
    dates: [],
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [subjectInspectRoll, setSubjectInspectRoll] = useState<number | null>(null);
  const [correctionPrefill, setCorrectionPrefill] = useState<CorrectionPrefill | null>(null);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setToken(null);
    setTeacher(null);
    setLedger({ students: [], records: [], subjects: [], dates: [] });
  }, []);

  const handleLoginSuccess = useCallback((nextToken: string, nextTeacher: TeacherUser) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    } catch {
      // ignore storage errors
    }
    setToken(nextToken);
    setTeacher(nextTeacher);
    setAuthChecking(false);
    setActiveTab('overview');
  }, []);

  // Verify existing session token on mount
  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) clearSession();
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setTeacher(data.teacher);
        }
      } catch {
        // leave token if network hiccup, fetchState will surface retry
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    }
    verifySession();
    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  const fetchState = useCallback(async () => {
    if (!token || !teacher) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/state', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        clearSession();
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load attendance data.');
      }
      const data: LedgerState = await res.json();
      setLedger(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach server.');
    } finally {
      setLoading(false);
    }
  }, [token, teacher, clearSession]);

  useEffect(() => {
    if (token && teacher) {
      fetchState();
    }
  }, [token, teacher, fetchState]);

  const shortageCount = useMemo(() => {
    return computeOverallRows(ledger.students, ledger.records).filter(
      (r) => r.total > 0 && r.percentage < 75
    ).length;
  }, [ledger.students, ledger.records]);

  const mutateApi = async (
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown
  ) => {
    if (!token) {
      clearSession();
      throw new Error('Please sign in first.');
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      clearSession();
      throw new Error('Session expired. Please sign in again.');
    }
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || 'Request failed.');
    }
    setLedger(payload as LedgerState);
  };

  const handleDownloadCsv = async (filename: 'students.csv' | 'attendance.csv') => {
    if (!token) return;
    const res = await fetch(`/api/export/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      clearSession();
      return;
    }
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAddStudent = async (rollNo: number, name: string) => {
    await mutateApi('/api/students', 'POST', { rollNo, name });
  };

  const handleDeleteStudent = async (rollNo: number) => {
    await mutateApi(`/api/students/${rollNo}`, 'DELETE');
  };

  const handleSubmitAttendance = async (payload: {
    date: string;
    subject: string;
    entries: Array<{ rollNo: number; status: 'P' | 'A' }>;
  }) => {
    await mutateApi('/api/attendance', 'POST', payload);
  };

  const handleUpdateAttendance = async (payload: {
    date: string;
    subject: string;
    entries: Array<{ rollNo: number; status: 'P' | 'A' }>;
  }) => {
    await mutateApi('/api/attendance', 'PUT', payload);
  };

  const handleCorrectAttendance = async (payload: {
    rollNo: number;
    subject: string;
    date: string;
    status: 'P' | 'A';
  }) => {
    await mutateApi('/api/attendance', 'PATCH', payload);
  };

  const handleImportStudentsCsv = async (csv: string) => {
    await mutateApi('/api/import/students', 'POST', { csv });
  };

  const handleImportAttendanceCsv = async (csv: string) => {
    await mutateApi('/api/import/attendance', 'POST', { csv });
  };

  const handleLoadSampleData = async () => {
    await mutateApi('/api/sample-data', 'POST');
  };

  const handleClearAllData = async () => {
    await mutateApi('/api/clear-data', 'POST');
  };

  const handleInspectStudentSubject = (rollNo: number) => {
    setSubjectInspectRoll(rollNo);
    setActiveTab('subject');
  };

  const handleJumpToCorrect = (prefill: CorrectionPrefill) => {
    setCorrectionPrefill(prefill);
    setActiveTab('correct');
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-slate-600">
        <div className="text-sm font-medium">Verifying teacher session...</div>
      </div>
    );
  }

  if (!token || !teacher) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const viewMeta = VIEW_TITLES[activeTab];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        studentCount={ledger.students.length}
        shortageCount={shortageCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        teacher={teacher}
        onLogout={clearSession}
        onDownloadCsv={handleDownloadCsv}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-slate-200 bg-white px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="truncate">Student Attendance Management</span>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-slate-900 truncate">{viewMeta.title}</span>
              </div>
              <h1 className="font-display text-base font-semibold tracking-tight text-slate-900 truncate">
                {viewMeta.title}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            {activeTab === 'mark' ? (
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                View Overall Report
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('mark')}
                className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                Mark Attendance
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-6 lg:px-8">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 rounded-lg border border-slate-200 bg-white animate-pulse" />
              <div className="h-80 rounded-lg border border-slate-200 bg-white animate-pulse" />
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={fetchState}
                className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewReport
                  students={ledger.students}
                  records={ledger.records}
                  subjects={ledger.subjects}
                  onNavigate={setActiveTab}
                  onInspectStudentSubject={handleInspectStudentSubject}
                />
              )}

              {activeTab === 'mark' && (
                <MarkAttendanceView
                  students={ledger.students}
                  records={ledger.records}
                  subjects={ledger.subjects}
                  onSubmitAttendance={handleSubmitAttendance}
                  onUpdateAttendance={handleUpdateAttendance}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'students' && (
                <StudentsView
                  students={ledger.students}
                  records={ledger.records}
                  onAddStudent={handleAddStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onImportStudentsCsv={handleImportStudentsCsv}
                  onImportAttendanceCsv={handleImportAttendanceCsv}
                  onLoadSampleData={handleLoadSampleData}
                  onClearAllData={handleClearAllData}
                />
              )}

              {activeTab === 'subject' && (
                <SubjectReportView
                  students={ledger.students}
                  records={ledger.records}
                  subjects={ledger.subjects}
                  initialRollNo={subjectInspectRoll}
                  onJumpToCorrect={handleJumpToCorrect}
                />
              )}

              {activeTab === 'shortage' && (
                <ShortageReportView
                  students={ledger.students}
                  records={ledger.records}
                  onInspectStudentSubject={handleInspectStudentSubject}
                />
              )}

              {activeTab === 'date' && (
                <DateReportView
                  students={ledger.students}
                  records={ledger.records}
                  dates={ledger.dates}
                  onJumpToCorrect={handleJumpToCorrect}
                />
              )}

              {activeTab === 'correct' && (
                <CorrectAttendanceView
                  students={ledger.students}
                  records={ledger.records}
                  subjects={ledger.subjects}
                  prefill={correctionPrefill}
                  onCorrectAttendance={handleCorrectAttendance}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
