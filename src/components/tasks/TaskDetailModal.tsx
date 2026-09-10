import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Calendar,
  BookOpen,
  MapPin,
  CheckCircle2,
  Circle,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Eye,
  AlertCircle,
  Youtube,
  FolderDown,
  Globe,
  Compass,
  Trash2,
} from 'lucide-react';
import { ClassTask, Subject } from '../../types';
import { useTasks } from '../../context/TaskContext';
import { getDeadlineInfo, formatDatePretty, formatTime12h } from '../../utils/dateUtils';
import { parseAllTaskLinks, ParsedLink } from '../../utils/linkUtils';
import { PdfViewerModal } from '../common/PdfViewerModal';

interface TaskDetailModalProps {
  task: ClassTask | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (task: ClassTask) => void;
  isAdmin?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  isAdmin = false,
}) => {
  const { taskProgress, toggleTaskCompletion, deleteTask } = useTasks();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string; size?: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePdfModal) {
          setActivePdfModal(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, activePdfModal]);

  if (!isOpen || !task) return null;

  const isCompleted = !!taskProgress[task.id];
  const deadline = getDeadlineInfo(task.deadlineDate, task.deadlineTime, isCompleted);
  const links: ParsedLink[] = parseAllTaskLinks(task.instructions, task.attachmentUrl);

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

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const renderLinkIcon = (category: ParsedLink['category']) => {
    switch (category) {
      case 'drive':
        return <FolderDown className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'youtube':
        return <Youtube className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'reading':
        return <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Globe className="w-4 h-4 text-zinc-400 shrink-0" />;
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-3xl glass-panel border border-white/[0.1] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col animate-card-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner with Countdown */}
          <div
            className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium ${
              isCompleted
                ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-300'
                : deadline.isOverdue
                ? 'bg-rose-500/[0.08] border-rose-500/20 text-rose-300'
                : deadline.isDueToday
                ? 'bg-amber-500/[0.08] border-amber-500/20 text-amber-300'
                : 'bg-white/[0.03] border-white/[0.06] text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono tabular-nums">
                {isCompleted ? 'Completed by you' : deadline.badgeText}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Close task details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Title & Tags */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getSubjectBadge(
                    task.section || task.subject
                  )}`}
                >
                  {task.section || task.subject}
                </span>

                {task.subtopic && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                    {task.subtopic}
                  </span>
                )}

                {task.priority !== 'Normal' && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                      task.priority === 'Urgent'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {task.priority}
                  </span>
                )}

                {task.givenInLecture && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.08] flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-zinc-500" />
                    {task.givenInLecture}
                  </span>
                )}
              </div>

              <h2 className={`text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                {task.title}
              </h2>

              {task.shortDescription && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                  {task.shortDescription}
                </p>
              )}
            </div>

            {/* Timetable & Logistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                  Assigned Lecture / Date
                </span>
                <span className="text-zinc-200 font-mono tabular-nums flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {formatDatePretty(task.assignedDate) || 'Assigned date not specified'}
                </span>
                {task.givenInLecture && (
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Given in: {task.givenInLecture}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">
                  Submission Deadline
                </span>
                <span className="text-zinc-200 font-mono tabular-nums flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  {formatDatePretty(task.deadlineDate)} at {formatTime12h(task.deadlineTime)}
                </span>
                {task.submissionLecture && (
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Target: {task.submissionLecture}
                  </span>
                )}
              </div>

              {task.submissionMethod && (
                <div className="sm:col-span-2 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">
                    <strong className="text-zinc-400 font-medium">Submission Method:</strong> {task.submissionMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Task Instructions */}
            {task.instructions && (
              <div>
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Detailed Instructions
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-sans select-text">
                  {task.instructions}
                </div>
              </div>
            )}

            {/* Rich Interactive Links Section */}
            {links.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Interactive Resources & Study Links ({links.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="glass-card p-3.5 rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0">
                          {renderLinkIcon(link.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border uppercase ${link.colorClasses.badge}`}>
                              {link.badgeLabel}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono truncate">{link.domain}</span>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-zinc-100 hover:text-emerald-300 block truncate mt-1 transition-colors"
                          >
                            {link.title}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.url)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedUrl === link.url ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-glass px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF Attachment Card (if present) */}
            {task.pdfAttachment && (
              <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                    <FileText className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
                        PDF Handout
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {task.pdfAttachment.sizeFormatted}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100 truncate mt-1">
                      {task.pdfAttachment.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setActivePdfModal({
                        url: task.pdfAttachment!.url,
                        title: task.pdfAttachment!.name,
                        size: task.pdfAttachment!.sizeFormatted,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read in App</span>
                  </button>
                  <a
                    href={task.pdfAttachment.url}
                    download
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    title="Download PDF"
                  >
                    <FolderDown className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Admin Guidance Notes */}
            {task.additionalNotes && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Faculty Guidance Note:</span>
                  <span>{task.additionalNotes}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 border-t border-white/[0.08] bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => toggleTaskCompletion(task.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isCompleted
                  ? 'btn-glass text-emerald-400'
                  : 'btn-primary-glass'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mark as Incomplete</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Mark as Completed</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to permanently delete "${task.title}"? This cannot be undone.`)) {
                      onClose();
                      await deleteTask(task.id);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Delete this task permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              )}

              {isAdmin && onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(task);
                  }}
                  className="btn-glass px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:text-white cursor-pointer"
                >
                  Edit Task
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-glass px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded In-App PDF Reader Modal */}
      {activePdfModal && (
        <PdfViewerModal
          isOpen={true}
          onClose={() => setActivePdfModal(null)}
          pdfUrl={activePdfModal.url}
          title={activePdfModal.title}
          fileSizeFormatted={activePdfModal.size}
        />
      )}
    </>,
    document.body
  );
};
