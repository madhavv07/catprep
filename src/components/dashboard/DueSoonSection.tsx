import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Flame,
  CheckSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ClassTask, ActiveView, Subject } from '../../types';
import { useTasks } from '../../context/TaskContext';
import { getDueSoonInfo, formatTime12h, formatDatePretty } from '../../utils/dateUtils';

interface DueSoonSectionProps {
  setActiveView: (view: ActiveView) => void;
}

export const DueSoonSection: React.FC<DueSoonSectionProps> = ({ setActiveView }) => {
  const { getDueIn24HoursTasks, toggleTaskCompletion, taskProgress } = useTasks();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const dueSoonTasks = getDueIn24HoursTasks();

  const getSubjectColor = (subject: Subject) => {
    switch (subject) {
      case 'VARC':
        return {
          bg: 'bg-[#0c1310]',
          border: 'border-emerald-800/40',
          badge: 'bg-emerald-950 text-emerald-400 border-emerald-800/60',
          accent: 'text-emerald-400',
        };
      case 'DILR':
        return {
          bg: 'bg-[#0a1219]',
          border: 'border-cyan-800/40',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-800/60',
          accent: 'text-cyan-400',
        };
      case 'QUANT':
      case 'QUANTS':
        return {
          bg: 'bg-[#100d1c]',
          border: 'border-violet-800/40',
          badge: 'bg-violet-950 text-violet-300 border-violet-800/60',
          accent: 'text-violet-400',
        };
      default:
        return {
          bg: 'bg-[#09090b]',
          border: 'border-zinc-800',
          badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
          accent: 'text-zinc-300',
        };
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Due Soon — Next 24 Hours
              </h3>
              {dueSoonTasks.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/60 animate-pulse">
                  {dueSoonTasks.length} Critical
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Immediate assignment deadlines requiring submission before scheduled lectures.
            </p>
          </div>
        </div>

        {dueSoonTasks.length > 0 && (
          <button
            onClick={() => setActiveView('my-tasks')}
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 self-start sm:self-auto transition"
          >
            <span>View All Tasks Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards List */}
      {dueSoonTasks.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-400 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                No urgent deadlines in the next 24 hours!
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Great job staying ahead of your CAT lecture deadlines. Focus on vocabulary revision or practice drills.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('calendar')}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition border border-zinc-700"
            >
              Check Timetable
            </button>
            <button
              onClick={() => setActiveView('varc-vocab')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-xs"
            >
              Study Vocab
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dueSoonTasks.map((task) => {
            const colors = getSubjectColor(task.section || (task.subject as any) || 'VARC');
            const isExpanded = expandedTaskId === task.id;
            const isDone = !!taskProgress[task.id];
            const dueInfo = getDueSoonInfo(task.deadlineDate, task.deadlineTime, false);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-5 transition flex flex-col justify-between space-y-3 ${colors.bg} ${colors.border} shadow-xl hover:scale-[1.005]`}
              >
                {/* Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${colors.badge}`}
                      >
                        {task.section || task.subject}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                        {task.subtopic}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/60 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {dueInfo.formattedCountdown}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white leading-snug">
                    {task.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {task.shortDescription}
                  </p>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-300 animate-in fade-in duration-150">
                    <div className="p-3 bg-black/40 rounded-xl space-y-1.5 border border-zinc-800/60 font-sans">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Instructions
                      </span>
                      <p className="whitespace-pre-line leading-relaxed">{task.instructions}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-black/30 border border-zinc-800/40">
                        <span className="text-zinc-500 block">Given in Lecture:</span>
                        <span className="font-semibold text-white">{task.givenInLecture}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/30 border border-zinc-800/40">
                        <span className="text-zinc-500 block">Submission:</span>
                        <span className="font-semibold text-white">{task.submissionMethod}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Bottom Footer & Actions */}
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                        : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 text-zinc-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isDone ? 'Marked Complete' : 'Mark as Done'}</span>
                  </button>

                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
