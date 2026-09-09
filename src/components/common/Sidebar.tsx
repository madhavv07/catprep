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
  X
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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-[#09090b] border-r border-zinc-800 transition-all duration-200 ease-in-out lg:static lg:top-auto lg:bottom-auto lg:left-auto lg:z-auto lg:h-[calc(100vh-6rem)] lg:sticky lg:top-20 lg:rounded-2xl lg:border lg:border-zinc-800 lg:shrink-0 ${
          isOpen
            ? 'translate-x-0 lg:flex'
            : '-translate-x-full lg:hidden'
        } overflow-y-auto flex flex-col justify-between text-zinc-300 font-sans`}
      >
        <div className="p-4 space-y-6">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
              <span className="text-[11px] font-medium">Close</span>
            </button>
          </div>

          {/* Main Core Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Study Hub
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNav('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'dashboard'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
                {taskStats.dueToday > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeView === 'dashboard'
                        ? 'bg-black text-emerald-400'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                    }`}
                  >
                    {taskStats.dueToday} today
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNav('calendar')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'calendar' || activeView === 'schedule'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4" />
                  <span>Master Timetable</span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    activeView === 'calendar' || activeView === 'schedule'
                      ? 'bg-black text-emerald-400'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  }`}
                >
                  Sept 2026
                </span>
              </button>



              <button
                onClick={() => handleNav('my-tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'my-tasks'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4" />
                  <span>My Tasks & Targets</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    activeView === 'my-tasks'
                      ? 'bg-black text-emerald-400'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {taskStats.pending}
                </span>
              </button>

              <button
                onClick={() => handleNav('feed')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeView === 'feed'
                    ? 'bg-emerald-500 text-black shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>Community Feed</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            </nav>
          </div>

          {/* Section: 📚 VARC Mastery */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                VARC Section
              </span>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNav('varc-vocab')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  activeView === 'varc-vocab'
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Vocabulary Vault</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeView === 'varc-vocab'
                      ? 'bg-black text-emerald-400 font-bold'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {vocabStats.total}
                </span>
              </button>

              <button
                onClick={() => handleNav('varc-test')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  activeView === 'varc-test'
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Vocabulary Drill</span>
                </div>
                {vocabStats.dueForRevision > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                    {vocabStats.dueForRevision} due
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNav('varc-tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  activeView === 'varc-tasks'
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ListTodo className="w-4 h-4" />
                  <span>VARC Assignments</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{varcPending}</span>
              </button>
            </nav>
          </div>

          {/* Section: 🔵 DILR Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                DILR Section
              </span>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNav('dilr-tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  activeView === 'dilr-tasks'
                    ? 'bg-cyan-500 text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ListTodo className="w-4 h-4 text-cyan-400" />
                  <span>DILR Assignments</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{dilrPending}</span>
              </button>
            </nav>
          </div>

          {/* Section: 🟢 Quants Section */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Quants Section
              </span>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => handleNav('quant-tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  activeView === 'quant-tasks'
                    ? 'bg-violet-500 text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ListTodo className="w-4 h-4 text-violet-400" />
                  <span>Quants Assignments</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">{quantPending}</span>
              </button>
            </nav>
          </div>

          {/* Admin Portal Section */}
          {isAdmin && (
            <div className="pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Admin Portal
                </span>
                <span className="text-[9px] bg-amber-950 border border-amber-800/60 text-amber-400 font-bold px-1.5 py-0.2 rounded font-mono">
                  ADMIN
                </span>
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNav('admin-create')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeView === 'admin-create'
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="w-4 h-4" />
                    <span>Publish Class Task</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('admin-manage')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeView === 'admin-manage'
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings2 className="w-4 h-4" />
                    <span>Manage Tasks</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('admin-users')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeView === 'admin-users' || activeView === 'admin-students'
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>Student Roster & Enroll</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('admin-stats')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    activeView === 'admin-stats'
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>Batch Analytics</span>
                  </div>
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Footer Batch Info */}
        <div className="p-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 space-y-1 font-mono">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Batch B-CAT2701</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div>Target: CAT 2027</div>
        </div>
      </aside>
    </>
  );
};
