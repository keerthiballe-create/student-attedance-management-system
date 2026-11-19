import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Download,
  FileEdit,
  LayoutDashboard,
  LogOut,
  Users,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { TeacherUser, ViewTab } from '../types';

interface SidebarProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  studentCount: number;
  shortageCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  teacher: TeacherUser;
  onLogout: () => void;
  onDownloadCsv: (file: 'students.csv' | 'attendance.csv') => void;
}

interface NavItem {
  id: ViewTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  studentCount,
  shortageCount,
  mobileOpen,
  onCloseMobile,
  teacher,
  onLogout,
  onDownloadCsv,
}: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overall Report', icon: LayoutDashboard },
    { id: 'mark', label: 'Mark Attendance', icon: CheckSquare },
    { id: 'students', label: 'Students', icon: Users, count: studentCount },
    { id: 'subject', label: 'Subject Report', icon: BookOpen },
    { id: 'shortage', label: 'Shortage (<75%)', icon: AlertTriangle, count: shortageCount },
    { id: 'date', label: 'Date Report', icon: CalendarDays },
    { id: 'correct', label: 'Correct Attendance', icon: FileEdit },
  ];

  const handleSelect = (id: ViewTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Attendance Ledger
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      item.id === 'shortage' && item.count > 0
                        ? 'font-semibold text-red-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="mb-2 text-xs font-medium text-slate-500">CSV Storage</div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onDownloadCsv('students.csv')}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
            >
              <span className="font-mono">students.csv</span>
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onDownloadCsv('attendance.csv')}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
            >
              <span className="font-mono">attendance.csv</span>
              <Download className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900">
                {teacher.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {teacher.department}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
