import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  BookOpen,
  ArrowRight,
  Sparkles,
  Search,
  CheckSquare,
  Filter,
  MessageSquare,
  Calendar,
  Award,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useVocab } from '../../context/VocabContext';
import { TaskCard } from '../tasks/TaskCard';
import { DueSoonSection } from './DueSoonSection';
import { ActiveView, Subject } from '../../types';

interface DashboardProps {
  setActiveView: (view: ActiveView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
  const { user } = useAuth();
  const { tasks, stats: taskStats } = useTasks();
  const { stats: vocabStats } = useVocab();
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Scholar';

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200 text-zinc-100 font-sans">
      {/* 1. Header Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Batch B-CAT2701
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08]">
              Target: CAT 2027
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Track daily class assignments, CAT syllabus progression, and test diagnostics.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveView('calendar')}
            className="px-3.5 py-2 rounded-xl text-xs font-medium btn-glass text-zinc-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Master Timetable</span>
          </button>

          <button
            onClick={() => setActiveView('varc-vocab')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold btn-primary-glass flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Vocab Vault</span>
          </button>
        </div>
      </div>

      {/* 2. Urgent Alert Banner */}
      {(taskStats.overdue > 0 || taskStats.dueToday > 0 || taskStats.dueTomorrow > 0) && (
        <div
          className={`p-4 sm:p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            taskStats.overdue > 0
              ? 'bg-rose-500/[0.06] border-rose-500/25 text-rose-300'
              : 'bg-amber-500/[0.06] border-amber-500/25 text-amber-300'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                taskStats.overdue > 0
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-white">
                {taskStats.overdue > 0
                  ? `Attention: You have ${taskStats.overdue} overdue assignment${taskStats.overdue > 1 ? 's' : ''}!`
                  : `Reminder: ${taskStats.dueToday} assignment${taskStats.dueToday > 1 ? 's' : ''} due today and ${taskStats.dueTomorrow} due tomorrow.`}
              </p>
              <p className="text-[11px] sm:text-xs opacity-80 mt-0.5">
                Complete and review all prerequisites before your next scheduled lecture.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('my-tasks')}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
              taskStats.overdue > 0
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
            }`}
          >
            <span>Review Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Summary Stat Cards (Apple / macOS Glass Widgets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Tasks */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="glass-card p-4 sm:p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Pending Tasks
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white tabular-nums">
              {taskStats.pending}
            </span>
            <span className="text-xs text-zinc-500 font-mono">of {taskStats.total} total</span>
          </div>
          <div className="mt-2.5 w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${taskStats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="glass-card p-4 sm:p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-emerald-400 tabular-nums">
              {taskStats.completed}
            </span>
            <span className="text-xs font-mono font-medium text-emerald-400/80">{taskStats.completionRate}% done</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Real-time completion rate</p>
        </div>

        {/* Due Soon 24h */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="glass-card p-4 sm:p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Due in 24h
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center transition">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                taskStats.dueSoon24h > 0 ? 'text-amber-400' : 'text-white'
              }`}
            >
              {taskStats.dueSoon24h}
            </span>
            <span className="text-xs text-zinc-500">
              {taskStats.dueSoon24h === 1 ? 'task urgent' : 'tasks urgent'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Deadlines approaching</p>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="glass-card p-4 sm:p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Overdue
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                taskStats.overdue > 0
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  : 'bg-white/[0.05] border border-white/[0.08] text-zinc-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                taskStats.overdue > 0 ? 'text-rose-400' : 'text-zinc-400'
              }`}
            >
              {taskStats.overdue}
            </span>
            <span className="text-xs text-zinc-500">
              {taskStats.overdue === 0 ? 'All caught up' : 'Needs urgent action'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Submit before lecture</p>
        </div>
      </div>

      {/* 4. Dedicated Due Soon Section */}
      <DueSoonSection setActiveView={setActiveView} />

      {/* 5. Two-Column Layout: Class Tasks & VARC Personal Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left 2 Columns: Today's Class Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Class Assignments & Study Tasks
              </h3>
              <p className="text-xs text-zinc-400">
                Official homework and lecture preparation for current cycles.
              </p>
            </div>

            {/* macOS Segmented Filter Control */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs">
              {(['ALL', 'VARC', 'DILR', 'QUANT'] as const).map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedSubject === subj
                      ? 'bg-white/[0.12] text-white shadow-xs font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {subj === 'ALL' ? 'All Sections' : subj}
                </button>
              ))}
            </div>
          </div>

          {/* Task List Cards */}
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl glass-card text-zinc-500 space-y-2">
              <CheckSquare className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="font-medium text-zinc-300 text-sm">No tasks in this category</p>
              <p className="text-xs">Select another subject filter or check back later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Column: VARC Vocabulary & Mastery Box */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-xs sm:text-sm">VARC Vocab Vault</h4>
                  <p className="text-[11px] text-zinc-400">Personal dictionary & mastery</p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {vocabStats.masteryScore}% Mastery
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-lg font-semibold text-white block tabular-nums">
                  {vocabStats.total}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Total Words</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                <span className="text-lg font-semibold text-rose-400 block tabular-nums">
                  {vocabStats.shaky}
                </span>
                <span className="text-[10px] text-rose-400/80 font-medium">Shaky</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                <span className="text-lg font-semibold text-amber-400 block tabular-nums">
                  {vocabStats.dueForRevision}
                </span>
                <span className="text-[10px] text-amber-400/80 font-medium">Due Revise</span>
              </div>
            </div>

            {/* Revision Callout if shaky words exist */}
            {vocabStats.shaky > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-amber-400 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Targeted Revision Recommended
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  You have {vocabStats.shaky} words marked as shaky. Test yourself now to reinforce retention before mocks.
                </p>
                <button
                  onClick={() => setActiveView('varc-test')}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-xs transition cursor-pointer"
                >
                  Test My Shaky Words Now
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setActiveView('varc-vocab')}
                className="w-full py-2.5 px-3 rounded-xl btn-primary-glass text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search / Add Words</span>
              </button>

              <button
                onClick={() => setActiveView('varc-test')}
                className="w-full py-2.5 px-3 rounded-xl btn-glass text-zinc-300 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Take Custom Vocabulary Drill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
