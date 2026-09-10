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
  ExternalLink,
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

  const getSubjectBadge = (subject: Subject) => {
    switch (subject) {
      case 'VARC':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DILR':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
      case 'QUANT':
      case 'QUANTS':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
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
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                Due Soon — Next 24 Hours
              </h3>
              {dueSoonTasks.length > 0 && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
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
            className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 self-start sm:self-auto transition cursor-pointer"
          >
            <span>View All Tasks Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards List */}
      {dueSoonTasks.length === 0 ? (
        <div className="p-6 rounded-2xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-xs sm:text-sm">
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
              className="px-3.5 py-1.5 rounded-xl btn-glass text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Check Timetable
            </button>
            <button
              onClick={() => setActiveView('varc-vocab')}
              className="px-3.5 py-1.5 rounded-xl btn-primary-glass text-xs font-semibold transition cursor-pointer"
            >
              Study Vocab
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dueSoonTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const isDone = !!taskProgress[task.id];
            const dueInfo = getDueSoonInfo(task.deadlineDate, task.deadlineTime, false);

            return (
              <div
                key={task.id}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border uppercase ${getSubjectBadge(
                          task.section || (task.subject as any) || 'VARC'
                        )}`}
                      >
                        {task.section || task.subject}
                      </span>
                      {task.subtopic && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.08]">
                          {task.subtopic}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {dueInfo.formattedCountdown}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-semibold text-white leading-snug">
                    {task.title}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {task.shortDescription}
                  </p>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-white/[0.08] text-xs text-zinc-300 animate-in fade-in duration-150">
                    <div className="p-3 bg-white/[0.03] rounded-xl space-y-1.5 border border-white/[0.06] font-sans">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Instructions
                      </span>
                      <p className="whitespace-pre-line leading-relaxed">{task.instructions}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <span className="text-zinc-500 block">Given in Lecture:</span>
                        <span className="font-medium text-white">{task.givenInLecture}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <span className="text-zinc-500 block">Submission:</span>
                        <span className="font-medium text-white">{task.submissionMethod}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Bottom Footer & Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'btn-glass text-zinc-300 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isDone ? 'Marked Complete' : 'Mark as Done'}</span>
                  </button>

                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
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
