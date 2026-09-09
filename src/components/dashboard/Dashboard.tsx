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
  Zap
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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase tracking-wider">
              Batch B-CAT2701
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
              Target: CAT 2027
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Track daily assignments, CAT syllabus progress, and test diagnostic readiness.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setActiveView('calendar')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Master Timetable</span>
          </button>



          <button
            onClick={() => setActiveView('varc-vocab')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Vocab Vault</span>
          </button>
        </div>
      </div>

      {/* 2. Urgent Alert Banner */}
      {(taskStats.overdue > 0 || taskStats.dueToday > 0 || taskStats.dueTomorrow > 0) && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            taskStats.overdue > 0
              ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
              : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                taskStats.overdue > 0 ? 'bg-rose-900/80 text-rose-300' : 'bg-amber-900/80 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {taskStats.overdue > 0
                  ? `Attention: You have ${taskStats.overdue} overdue assignment${taskStats.overdue > 1 ? 's' : ''}!`
                  : `Reminder: ${taskStats.dueToday} assignment${taskStats.dueToday > 1 ? 's' : ''} due today and ${taskStats.dueTomorrow} due tomorrow.`}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Complete and review all prerequisites before your next scheduled lecture.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('my-tasks')}
            className={`text-xs font-bold px-4 py-2 rounded-xl border shrink-0 transition flex items-center gap-1.5 shadow-xs ${
              taskStats.overdue > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400'
            }`}
          >
            <span>Review Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Tasks */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="p-4 sm:p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Pending Tasks
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {taskStats.pending}
            </span>
            <span className="text-xs text-zinc-500 font-mono">of {taskStats.total} total</span>
          </div>
          <div className="mt-2 w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${taskStats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="p-4 sm:p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Completed
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              {taskStats.completed}
            </span>
            <span className="text-xs font-mono font-medium text-emerald-500">{taskStats.completionRate}% done</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Real-time student progress</p>
        </div>

        {/* Due Soon 24h */}
        <div
          onClick={() => setActiveView('my-tasks')}
          className="p-4 sm:p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Due in 24h
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center transition">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
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
          className="p-4 sm:p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 transition cursor-pointer group shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Overdue
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                taskStats.overdue > 0 ? 'bg-rose-950 text-rose-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Today's Class Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">
                Today’s Class Tasks
              </h3>
              <p className="text-xs text-zinc-400">
                Official class assignments in current lecture cycles.
              </p>
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              {(['ALL', 'VARC', 'DILR', 'QUANT'] as const).map((subj) => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    selectedSubject === subj
                      ? 'bg-emerald-500 text-black shadow-xs'
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
            <div className="p-12 text-center rounded-2xl bg-[#09090b] border border-zinc-800 text-zinc-500 space-y-2">
              <CheckSquare className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="font-medium text-zinc-300">No tasks in this category</p>
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
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">VARC Vocab Vault</h4>
                  <p className="text-[11px] text-zinc-500">Personal dictionary & mastery</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                {vocabStats.masteryScore}% Mastery
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-lg font-bold font-mono text-white block">
                  {vocabStats.total}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Total Words</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/40">
                <span className="text-lg font-bold font-mono text-rose-400 block">
                  {vocabStats.shaky}
                </span>
                <span className="text-[10px] text-rose-400 font-medium">Shaky</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/40">
                <span className="text-lg font-bold font-mono text-amber-400 block">
                  {vocabStats.dueForRevision}
                </span>
                <span className="text-[10px] text-amber-400 font-medium">Due Revise</span>
              </div>
            </div>

            {/* Revision Callout if shaky words exist */}
            {vocabStats.shaky > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Targeted Revision Recommended
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  You have {vocabStats.shaky} words marked as shaky. Test yourself now to reinforce memory retention before mocks.
                </p>
                <button
                  onClick={() => setActiveView('varc-test')}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition"
                >
                  Test My Shaky Words Now
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setActiveView('varc-vocab')}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search / Add Words</span>
              </button>

              <button
                onClick={() => setActiveView('varc-test')}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Take Custom Vocabulary Drill</span>
              </button>
            </div>
          </div>

          {/* Quick Study Advice Widget */}
          <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800 text-zinc-200 space-y-2.5 shadow-xl">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CAT 2027 Strategy Insight</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-serif italic">
              "In CAT VARC, never rely merely on basic primary definitions. Focus heavily on secondary, figurative meanings and how authors use nuanced words to establish tone."
            </p>
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>RC & VA Strategy</span>
              <button
                onClick={() => setActiveView('varc-vocab')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Explore Vocabulary &rarr;
              </button>
            </div>
          </div>

          {/* Community Feed Card */}
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Student Community Feed
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Have questions about what's due, lecture doubts, or practice questions? Connect directly with fellow scholars.
            </p>
            <button
              onClick={() => setActiveView('feed')}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask / Check What's Due &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
