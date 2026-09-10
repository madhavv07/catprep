import React from 'react';
import {
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { getDeadlineInfo } from '../../utils/dateUtils';
import { ActiveView } from '../../types';

interface TaskStatisticsViewProps {
  setActiveView: (view: ActiveView) => void;
}

export const TaskStatisticsView: React.FC<TaskStatisticsViewProps> = ({ setActiveView }) => {
  const { tasks } = useTasks();

  const varcCount = tasks.filter((t) => t.subject === 'VARC').length;
  const dilrCount = tasks.filter((t) => t.subject === 'DILR').length;
  const quantCount = tasks.filter((t) => t.subject === 'QUANT').length;

  const urgentCount = tasks.filter((t) => t.priority === 'Urgent').length;
  const importantCount = tasks.filter((t) => t.priority === 'Important').length;
  const normalCount = tasks.filter((t) => t.priority === 'Normal').length;

  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueTomorrowCount = 0;
  let upcomingCount = 0;

  tasks.forEach((t) => {
    const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, false);
    if (info.isOverdue) overdueCount++;
    else if (info.isDueToday) dueTodayCount++;
    else if (info.isDueTomorrow) dueTomorrowCount++;
    else upcomingCount++;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Curriculum Analytics
          </span>
          <span className="text-xs text-zinc-600">&bull;</span>
          <span className="text-xs text-zinc-400 font-medium">Batch Task Overview</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
          Task Statistics & Workload
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Monitor assignment balance across subjects and track deadline pressure for your students.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Total Published
          </span>
          <span className="text-3xl font-bold text-white mt-2 block tabular-nums">
            {tasks.filter((t) => t.status === 'published').length}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">Live on student feeds</span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Draft Queue
          </span>
          <span className="text-3xl font-bold text-zinc-300 mt-2 block tabular-nums">
            {tasks.filter((t) => t.status === 'draft').length}
          </span>
          <span className="text-[11px] text-zinc-500">Unpublished</span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
            Due in 48h
          </span>
          <span className="text-3xl font-bold text-amber-400 mt-2 block tabular-nums">
            {dueTodayCount + dueTomorrowCount}
          </span>
          <span className="text-[11px] text-amber-500/80">{dueTodayCount} today, {dueTomorrowCount} tomorrow</span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">
            Overdue Batch Tasks
          </span>
          <span className="text-3xl font-bold text-rose-400 mt-2 block tabular-nums">
            {overdueCount}
          </span>
          <span className="text-[11px] text-rose-500/80">May require reminder</span>
        </div>
      </div>

      {/* Subject Distribution */}
      <div className="p-6 sm:p-7 rounded-3xl glass-panel space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 tracking-tight">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Subject Workload Distribution
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl glass-card">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">VARC</span>
              <span className="text-xs font-mono text-zinc-300 tabular-nums">{varcCount} tasks</span>
            </div>
            <div className="mt-3 w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${tasks.length > 0 ? (varcCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 tabular-nums">
              {tasks.length > 0 ? Math.round((varcCount / tasks.length) * 100) : 0}% of all assignments
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 text-sm">DILR</span>
              <span className="text-xs font-mono text-zinc-300 tabular-nums">{dilrCount} tasks</span>
            </div>
            <div className="mt-3 w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                style={{ width: `${tasks.length > 0 ? (dilrCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 tabular-nums">
              {tasks.length > 0 ? Math.round((dilrCount / tasks.length) * 100) : 0}% of all assignments
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">QUANT</span>
              <span className="text-xs font-mono text-zinc-300 tabular-nums">{quantCount} tasks</span>
            </div>
            <div className="mt-3 w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${tasks.length > 0 ? (quantCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 tabular-nums">
              {tasks.length > 0 ? Math.round((quantCount / tasks.length) * 100) : 0}% of all assignments
            </p>
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="p-6 sm:p-7 rounded-3xl glass-panel space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2 tracking-tight">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Priority Breakdown
        </h3>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-2xl glass-card border border-rose-500/20 bg-rose-500/[0.04]">
            <span className="text-2xl font-bold text-rose-400 block tabular-nums">{urgentCount}</span>
            <span className="text-xs font-semibold text-rose-400/90 uppercase tracking-wider mt-1 block">
              Urgent Tasks
            </span>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-amber-500/20 bg-amber-500/[0.04]">
            <span className="text-2xl font-bold text-amber-400 block tabular-nums">{importantCount}</span>
            <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mt-1 block">
              Important Tasks
            </span>
          </div>

          <div className="p-4 rounded-2xl glass-card">
            <span className="text-2xl font-bold text-zinc-200 block tabular-nums">{normalCount}</span>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-1 block">
              Standard Tasks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
