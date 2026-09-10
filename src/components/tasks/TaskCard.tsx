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
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { ClassTask, Subject } from '../../types';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { getDeadlineInfo, formatDatePretty, formatTime12h } from '../../utils/dateUtils';
import { parseAllTaskLinks } from '../../utils/linkUtils';
import { TaskDetailModal } from './TaskDetailModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isCompleted = !!taskProgress[task.id];
  const deadline = getDeadlineInfo(task.deadlineDate, task.deadlineTime, isCompleted);
  const detectedLinks = parseAllTaskLinks(task.instructions, task.attachmentUrl);

  // Subject pill color - subtle translucent macOS glass pills
  const getSubjectBadge = (subject?: Subject) => {
    switch (subject) {
      case 'VARC':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DILR':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
      case 'QUANT':
      case 'QUANTS':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/20';
      default:
        return 'bg-white/[0.06] text-zinc-300 border-white/[0.08]';
    }
  };

  // Priority styling
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/25 font-medium';
      case 'Important':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25 font-medium';
      default:
        return 'bg-white/[0.04] text-zinc-400 border-white/[0.08]';
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
      onClick={() => setIsModalOpen(true)}
      className={`glass-card rounded-2xl relative overflow-hidden transition-all duration-300 group cursor-pointer ${
        isCompleted
          ? 'opacity-70 border-white/[0.04] bg-white/[0.02]'
          : deadline.isOverdue
          ? 'border-rose-500/30 bg-rose-500/[0.03] shadow-lg shadow-rose-950/20'
          : deadline.isDueToday
          ? 'border-amber-500/30 bg-amber-500/[0.03] shadow-lg shadow-amber-950/20'
          : 'border-white/[0.08] hover:border-white/[0.16]'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Header Badges & Completion Checkbox */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            <button
              onClick={handleToggle}
              className="group/btn shrink-0 mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
              title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
              aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600 group-hover/btn:text-emerald-400 transition-colors" />
              )}
            </button>

            {/* Subject + Priority + Draft/Publish + Deadline pill */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getSubjectBadge(
                  task.section || task.subject
                )}`}
              >
                {task.section || task.subject}
              </span>

              {task.subtopic && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                  {task.subtopic}
                </span>
              )}

              {task.priority !== 'Normal' && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md border ${getPriorityBadge(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              )}

              {task.status === 'draft' && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-500 border border-white/[0.08]">
                  DRAFT
                </span>
              )}

              {/* Deadline badge */}
              <span
                className={`text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border tabular-nums ${
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : deadline.badgeVariant === 'overdue'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 font-medium'
                    : deadline.badgeVariant === 'urgent'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium'
                    : deadline.badgeVariant === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span>{deadline.badgeText}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Inspect / Open Modal Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Open full task inspector"
              aria-label="Open full task inspector"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 cursor-pointer"
                title={`Delete "${task.title}"`}
                aria-label={`Delete "${task.title}"`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Quick Expand Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors shrink-0 cursor-pointer"
              aria-label={expanded ? 'Collapse task details' : 'Expand task details'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Task Title & Short description */}
        <div className="mt-3 pl-8">
          <h3
            onClick={() => setIsModalOpen(true)}
            className={`text-base sm:text-lg font-semibold text-white cursor-pointer hover:text-emerald-300 transition-colors leading-snug flex items-center gap-2 group/title ${
              isCompleted ? 'line-through text-zinc-500' : ''
            }`}
          >
            <span>{task.title}</span>
            <Maximize2 className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
          </h3>

          {task.shortDescription && (
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
              {task.shortDescription}
            </p>
          )}

          {/* Key metadata chips */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-400 font-mono">
            {task.givenInLecture && (
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300">{task.givenInLecture}</span>
              </div>
            )}

            {task.submissionMethod && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{task.submissionMethod}</span>
              </div>
            )}

            {task.deadlineDate && (
              <div className="flex items-center gap-1.5 text-zinc-400 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>
                  Submit: {formatDatePretty(task.deadlineDate)} ({formatTime12h(task.deadlineTime)})
                </span>
              </div>
            )}

            {/* Rich Resource Badges */}
            {task.pdfAttachment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer text-xs"
              >
                <FileText className="w-3 h-3 text-rose-400" />
                <span>PDF Handout</span>
              </button>
            )}

            {detectedLinks.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer text-xs"
              >
                <ExternalLink className="w-3 h-3 text-sky-400" />
                <span>{detectedLinks.length} {detectedLinks.length === 1 ? 'Link' : 'Links'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Deep Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/[0.08] pl-8 space-y-3.5 text-xs text-zinc-300 animate-in fade-in duration-150 font-sans">
            {/* Full Instructions */}
            {task.instructions && (
              <div>
                <h4 className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider mb-1.5">
                  Task Instructions
                </h4>
                <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06] whitespace-pre-line leading-relaxed text-zinc-200 select-text">
                  {task.instructions}
                </div>
              </div>
            )}

            {/* Submission Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                  Assigned Date
                </span>
                <span className="text-zinc-200 font-mono tabular-nums">
                  {formatDatePretty(task.assignedDate) || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                  Final Deadline
                </span>
                <span className="text-zinc-200 font-mono tabular-nums">
                  {formatDatePretty(task.deadlineDate)} at {formatTime12h(task.deadlineTime)}
                </span>
              </div>

              {task.submissionLecture && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                    Target Submission Lecture
                  </span>
                  <span className="text-zinc-200 font-mono">{task.submissionLecture}</span>
                </div>
              )}

              {task.createdByName && (
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                    Admin Assigned
                  </span>
                  <span className="text-white font-medium">{task.createdByName}</span>
                </div>
              )}
            </div>

            {/* Additional Admin Notes */}
            {task.additionalNotes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Admin Guidance / Advisory:</span>
                    <span>{task.additionalNotes}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Controls Toolbar (if viewing in admin mode) */}
            {(showAdminControls || isAdmin) && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePublishToggle}
                    className="btn-glass px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
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
                    className="btn-glass px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
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
                      className="btn-glass px-3 py-1.5 rounded-xl text-xs font-medium text-amber-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      Edit
                    </button>
                  )}
                </div>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Task Inspector Modal */}
      <TaskDetailModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEdit={onEdit}
        isAdmin={isAdmin}
      />
    </div>
  );
};
