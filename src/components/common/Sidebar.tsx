import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  ListTodo,
  CheckSquare,
  User,
  PlusCircle,
  Settings2,
  Users,
  BarChart3,
  ChevronRight,
  Shield,
  Sparkles,
  Layers,
  MessageSquare,
  Calendar,
  Award,
  X,
} from 'lucide-react';
import { ActiveView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useVocab } from '../../context/VocabContext';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isOpen,
  onClose,
}) => {
  const { isAdmin } = useAuth();
  const { stats: taskStats, getTasksBySubject } = useTasks();
  const { stats: vocabStats } = useVocab();

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    onClose();
  };

  const varcPending = getTasksBySubject('VARC').filter((t) => !t.status || t.status === 'published').length;
  const dilrPending = getTasksBySubject('DILR').filter((t) => !t.status || t.status === 'published').length;
  const quantPending = getTasksBySubject('QUANT').filter((t) => !t.status || t.status === 'published').length;

  const renderNavItem = (
    viewKey: ActiveView | ActiveView[],
    icon: React.ReactNode,
    label: string,
    badge?: React.ReactNode,
    accentColor: string = 'text-emerald-400'
  ) => {
    const isActive = Array.isArray(viewKey) ? viewKey.includes(activeView) : activeView === viewKey;
    const targetView = Array.isArray(viewKey) ? viewKey[0] : viewKey;

    return (
      <button
        onClick={() => handleNav(targetView)}
        className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
          isActive
            ? 'bg-white/[0.09] text-white border border-white/[0.12] shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 transition ${isActive ? accentColor : 'text-zinc-400 group-hover:text-zinc-200'}`}>
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-zinc-950/80 backdrop-blur-2xl border-r border-white/[0.08] transition-all duration-200 ease-in-out lg:static lg:top-auto lg:bottom-auto lg:left-auto lg:z-auto lg:h-[calc(100vh-6rem)] lg:sticky lg:top-20 lg:rounded-3xl lg:border lg:border-white/[0.08] lg:shrink-0 ${
          isOpen
            ? 'translate-x-0 lg:flex'
            : '-translate-x-full lg:hidden'
        } overflow-y-auto flex flex-col justify-between text-zinc-300 font-sans shadow-xl`}
      >
        <div className="p-3.5 space-y-5">
          {/* Mobile Close Header */}
          <div className="flex lg:hidden items-center justify-between px-2 pb-2 border-b border-white/[0.08]">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
              title="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Study Hub */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Study Hub
            </div>
            <nav className="space-y-0.5">
              {renderNavItem(
                'dashboard',
                <LayoutDashboard className="w-4 h-4" />,
                'Dashboard',
                taskStats.dueToday > 0 ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {taskStats.dueToday} today
                  </span>
                ) : null
              )}

              {renderNavItem(
                ['calendar', 'schedule'],
                <Calendar className="w-4 h-4" />,
                'Master Timetable',
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  Sept 2026
                </span>
              )}

              {renderNavItem(
                'my-tasks',
                <CheckSquare className="w-4 h-4" />,
                'My Tasks & Targets',
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  {taskStats.pending}
                </span>
              )}

              {renderNavItem(
                'feed',
                <MessageSquare className="w-4 h-4" />,
                'Community Feed',
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse" />
              )}
            </nav>
          </div>

          {/* Section: 🟢 VARC Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                VARC Section
              </span>
            </div>
            <nav className="space-y-0.5">
              {renderNavItem(
                'varc-vocab',
                <BookOpen className="w-4 h-4" />,
                'Vocabulary Vault',
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  {vocabStats.total}
                </span>
              )}

              {renderNavItem(
                'varc-test',
                <HelpCircle className="w-4 h-4" />,
                'Vocabulary Drill',
                vocabStats.dueForRevision > 0 ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {vocabStats.dueForRevision} due
                  </span>
                ) : null
              )}

              {renderNavItem(
                'varc-tasks',
                <ListTodo className="w-4 h-4" />,
                'VARC Assignments',
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  {varcPending}
                </span>
              )}
            </nav>
          </div>

          {/* Section: 🔵 DILR Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                DILR Section
              </span>
            </div>
            <nav className="space-y-0.5">
              {renderNavItem(
                'dilr-tasks',
                <ListTodo className="w-4 h-4" />,
                'DILR Assignments',
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  {dilrPending}
                </span>,
                'text-cyan-400'
              )}
            </nav>
          </div>

          {/* Section: 🟣 Quants Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Quants Section
              </span>
            </div>
            <nav className="space-y-0.5">
              {renderNavItem(
                'quant-tasks',
                <ListTodo className="w-4 h-4" />,
                'Quants Assignments',
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-zinc-400">
                  {quantPending}
                </span>,
                'text-violet-400'
              )}
            </nav>
          </div>

          {/* Admin Faculty Controls */}
          {isAdmin && (
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Faculty Admin
                </span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  OFFICIAL
                </span>
              </div>
              <nav className="space-y-0.5">
                {renderNavItem(
                  'admin-create',
                  <PlusCircle className="w-4 h-4" />,
                  'Publish Class Task',
                  null,
                  'text-amber-400'
                )}

                {renderNavItem(
                  'admin-manage',
                  <Settings2 className="w-4 h-4" />,
                  'Manage Tasks',
                  null,
                  'text-amber-400'
                )}

                {renderNavItem(
                  ['admin-users', 'admin-students'],
                  <Users className="w-4 h-4" />,
                  'Student Roster & Vault',
                  null,
                  'text-amber-400'
                )}

                {renderNavItem(
                  'admin-stats',
                  <BarChart3 className="w-4 h-4" />,
                  'Batch Analytics',
                  null,
                  'text-amber-400'
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Footer Batch Pill */}
        <div className="p-3.5 border-t border-white/[0.08] text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-300">Batch B-CAT2701</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Target: CAT 2027</span>
        </div>
      </aside>
    </>
  );
};
