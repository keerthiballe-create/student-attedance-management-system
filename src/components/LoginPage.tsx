import { AlertCircle, BookCheck, Lock, Mail, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { TeacherUser } from '../types';

interface LoginPageProps {
  onLoginSuccess: (token: string, teacher: TeacherUser) => void;
}

type AuthMode = 'login' | 'register';

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
  };

  const fillDemoCredentials = () => {
    setMode('login');
    setEmail('teacher@college.edu');
    setPassword('password123');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email: email.trim(), password }
          : {
              name: name.trim(),
              department: department.trim(),
              email: email.trim(),
              password,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Authentication failed.');
      }

      onLoginSuccess(payload.token, payload.teacher);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <header className="flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 lg:px-10">
        <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Attendance Ledger
        </span>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
          Faculty Portal
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-10 lg:px-8">
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Institutional Summary */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-8 lg:col-span-5">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <BookCheck className="h-5 w-5" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                Teacher Attendance Management Portal
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Sign in with your faculty credentials to manage class rosters, mark daily
                Present/Absent attendance, review 75% eligibility standing, and update records.
              </p>

              <dl className="mt-8 divide-y divide-slate-200 border-t border-b border-slate-200 text-xs">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Eligibility Rule</dt>
                  <dd className="font-mono font-medium text-slate-900 tabular-nums">
                    75.00% Minimum
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Storage Format</dt>
                  <dd className="font-mono font-medium text-slate-900">
                    students.csv · attendance.csv
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Reports</dt>
                  <dd className="font-medium text-slate-900">
                    Overall · Subject · Shortage · Date
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-900">
                Demo Faculty Credentials
              </div>
              <div className="mt-1.5 space-y-1 font-mono text-xs text-slate-600">
                <div>Email: teacher@college.edu</div>
                <div>Password: password123</div>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 whitespace-nowrap"
              >
                Use Demo Credentials
              </button>
            </div>
          </div>

          {/* Right Auth Form */}
          <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-8 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {mode === 'login' ? 'Teacher Sign In' : 'Create Teacher Account'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {mode === 'login'
                    ? 'Enter your faculty email and password to access the attendance ledger.'
                    : 'Register a new faculty account stored in teachers.csv.'}
                </p>
              </div>

              <div
                className="flex items-center gap-1 rounded-md bg-slate-100 p-1"
                role="tablist"
                aria-label="Teacher authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => switchMode('register')}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="teacher-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Full Name
                    </label>
                    <div className="relative mt-1.5">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="teacher-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Prof. Vikram Nair"
                        required
                        className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="teacher-dept"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Department
                    </label>
                    <input
                      id="teacher-dept"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="teacher-email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Faculty Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="teacher-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@college.edu"
                    required
                    className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="teacher-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="teacher-password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? 'Enter password' : 'Minimum 6 characters'}
                    required
                    className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 w-full rounded-md bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting
                    ? mode === 'login'
                      ? 'Signing In...'
                      : 'Creating Account...'
                    : mode === 'login'
                      ? 'Sign In to Ledger'
                      : 'Create Teacher Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
