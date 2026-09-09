import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  BookOpen,
  MapPin,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Trash2,
  Send,
  EyeOff,
  UserCheck,
  Check
} from 'lucide-react';
import { ClassTask, Subject } from '../../types';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { getDeadlineInfo, formatDatePretty, formatTime12h } from '../../utils/dateUtils';

interface TaskCardProps {
  task: ClassTask;
  onEdit?: (task: ClassTask) => void;
  showAdminControls?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  showAdminControls = false,
}) => {
  const { taskProgress, toggleTaskCompletion, duplicateTask, deleteTask, publishTask, unpublishTask } = useTasks();
  const { isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCompleted = !!taskProgress[task.id];
  const deadline = getDeadlineInfo(task.deadlineDate, task.deadlineTime, isCompleted);

  // Subject pill color
  const getSubjectBadge = (subject?: Subject) => {
    switch (subject) {
      case 'VARC':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800/60';
      case 'DILR':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800/60';
      case 'QUANT':
      case 'QUANTS':
        return 'bg-violet-950 text-violet-300 border-violet-800/60';
      default:
        return 'bg-zinc-900 text-zinc-300 border-zinc-700';
    }
  };

  // Priority styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-950 text-rose-400 border-rose-800/60 font-semibold';
      case 'Important':
        return 'bg-amber-950 text-amber-400 border-amber-800/60 font-medium';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskCompletion(task.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      setIsDeleting(true);
      await deleteTask(task.id);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateTask(task);
  };

  const handlePublishToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === 'published') {
      await unpublishTask(task.id);
    } else {
      await publishTask(task.id);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-[#09090b] ${
        isCompleted
          ? 'border-emerald-900/40 bg-zinc-950/70 opacity-80'
          : deadline.isOverdue
          ? 'border-rose-900/60 shadow-lg shadow-rose-950/20'
          : deadline.isDueToday
          ? 'border-amber-800/60 shadow-lg shadow-amber-950/20'
          : 'border-zinc-800 hover:border-zinc-700 shadow-xl'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Header Badges & Completion Checkbox */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            <button
              onClick={handleToggle}
              className="group shrink-0 mt-0.5 text-zinc-500 hover:text-emerald-400 transition"
              title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
              aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400" />
              )}
            </button>

            {/* Subject + Priority + Draft/Publish + Deadline pill */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getSubjectBadge(
                  task.section || task.subject
                )}`}
              >
                {task.section || task.subject}
              </span>

              {task.subtopic && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {task.subtopic}
                </span>
              )}

              {task.priority !== 'Normal' && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border ${getPriorityBadge(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              )}

              {task.status === 'draft' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                  DRAFT
                </span>
              )}

              {/* Deadline badge */}
              <span
                className={`text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  isCompleted
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                    : deadline.badgeVariant === 'overdue'
                    ? 'bg-rose-950 text-rose-400 border-rose-800/60 font-semibold'
                    : deadline.badgeVariant === 'urgent'
                    ? 'bg-amber-950 text-amber-300 border-amber-700 font-semibold'
                    : deadline.badgeVariant === 'warning'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span>{deadline.badgeText}</span>
              </span>
            </div>
          </div>

          {/* Admin quick delete & expand toggle */}
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition shrink-0 cursor-pointer"
                title={`Delete "${task.title}"`}
                aria-label={`Delete "${task.title}"`}
              >
                <Trash2 className="w-4 h-4 text-zinc-500 hover:text-rose-400" />
              </button>
            )}

            {/* Quick Expand Button */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-850 transition shrink-0 cursor-pointer"
              aria-label={expanded ? 'Collapse task details' : 'Expand task details'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Task Title & Short description */}
        <div className="mt-3 pl-8">
          <h3
            onClick={() => setExpanded(!expanded)}
            className={`text-base sm:text-lg font-bold text-white cursor-pointer hover:text-emerald-400 transition leading-snug ${
              isCompleted ? 'line-through text-zinc-500' : ''
            }`}
          >
            {task.title}
          </h3>

          {task.shortDescription && (
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              {task.shortDescription}
            </p>
          )}

          {/* Key metadata chips */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-400 font-mono">
            {task.givenInLecture && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300">{task.givenInLecture}</span>
              </div>
            )}

            {task.submissionMethod && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{task.submissionMethod}</span>
              </div>
            )}

            {task.deadlineDate && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  Submit: {formatDatePretty(task.deadlineDate)} ({formatTime12h(task.deadlineTime)})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Deep Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-zinc-800 pl-8 space-y-3.5 text-xs text-zinc-300 animate-in fade-in duration-150 font-sans">
            {/* Full Instructions */}
            {task.instructions && (
              <div>
                <h4 className="font-bold text-white text-[11px] uppercase tracking-wider mb-1">
                  Task Instructions
                </h4>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 whitespace-pre-line leading-relaxed text-zinc-200">
                  {task.instructions}
                </div>
              </div>
            )}

            {/* Submission Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                  Assigned Date
                </span>
                <span className="text-zinc-200 font-mono">
                  {formatDatePretty(task.assignedDate) || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                  Final Deadline
                </span>
                <span className="text-zinc-200 font-mono">
                  {formatDatePretty(task.deadlineDate)} at {formatTime12h(task.deadlineTime)}
                </span>
              </div>

              {task.submissionLecture && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                    Target Submission Lecture
                  </span>
                  <span className="text-zinc-200 font-mono">{task.submissionLecture}</span>
                </div>
              )}

              {task.createdByName && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                    Admin Assigned
                  </span>
                  <span className="text-white font-semibold">{task.createdByName}</span>
                </div>
              )}
            </div>

            {/* Additional Admin Notes */}
            {task.additionalNotes && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Admin Guidance / Advisory:</span>
                    <span>{task.additionalNotes}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Controls Toolbar (if viewing in admin mode) */}
            {(showAdminControls || isAdmin) && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePublishToggle}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center gap-1 transition"
                  >
                    {task.status === 'published' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                        Unpublish to Draft
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        Publish to Class
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDuplicate}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center gap-1 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    Duplicate
                  </button>

                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 flex items-center gap-1 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      Edit
                    </button>
                  )}
                </div>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
