import React, { useState, useEffect } from 'react';
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
  const { taskProgress, toggleTaskCompletion } = useTasks();
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DILR':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'QUANT':
      case 'QUANTS':
        return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
      default:
        return 'bg-zinc-900 text-zinc-300 border-zinc-700';
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner with Countdown */}
          <div
            className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium ${
              isCompleted
                ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                : deadline.isOverdue
                ? 'bg-rose-950/50 border-rose-800/50 text-rose-300'
                : deadline.isDueToday
                ? 'bg-amber-950/50 border-amber-800/50 text-amber-300'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isCompleted ? 'Completed by you' : deadline.badgeText}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              aria-label="Close task details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {/* Title & Tags */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getSubjectBadge(
                    task.section || task.subject
                  )}`}
                >
                  {task.section || task.subject}
                </span>

                {task.subtopic && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {task.subtopic}
                  </span>
                )}

                {task.priority !== 'Normal' && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                      task.priority === 'Urgent'
                        ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    }`}
                  >
                    {task.priority}
                  </span>
                )}

                {task.givenInLecture && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-zinc-500" />
                    {task.givenInLecture}
                  </span>
                )}
              </div>

              <h2 className={`text-xl sm:text-2xl font-serif font-bold text-zinc-100 leading-snug ${isCompleted ? 'line-through text-zinc-500' : ''}`}>
                {task.title}
              </h2>

              {task.shortDescription && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                  {task.shortDescription}
                </p>
              )}
            </div>

            {/* Timetable & Logistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                  Assigned Lecture / Date
                </span>
                <span className="text-zinc-200 font-mono flex items-center gap-1.5">
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
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                  Submission Deadline
                </span>
                <span className="text-zinc-200 font-mono flex items-center gap-1.5">
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
                <div className="sm:col-span-2 pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-zinc-300">
                    <strong className="text-zinc-400">Submission Method:</strong> {task.submissionMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Task Instructions */}
            {task.instructions && (
              <div>
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Detailed Instructions
                </h4>
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-sans select-text">
                  {task.instructions}
                </div>
              </div>
            )}

            {/* Rich Interactive Links Section */}
            {links.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Interactive Resources & Study Links ({links.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${link.colorClasses.card}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
                          {renderLinkIcon(link.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${link.colorClasses.badge}`}>
                              {link.badgeLabel}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-mono truncate">{link.domain}</span>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs font-semibold text-zinc-100 hover:underline block truncate mt-0.5 ${link.colorClasses.hover}`}
                          >
                            {link.title}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(link.url)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
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
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center gap-1 transition"
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
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 shrink-0">
                    <FileText className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                        PDF Handout
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {task.pdfAttachment.sizeFormatted}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100 truncate mt-0.5">
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
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read in App</span>
                  </button>
                  <a
                    href={task.pdfAttachment.url}
                    download
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Download PDF"
                  >
                    <FolderDown className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Admin Guidance Notes */}
            {task.additionalNotes && (
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Faculty Guidance Note:</span>
                  <span>{task.additionalNotes}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => toggleTaskCompletion(task.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isCompleted
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
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
              {isAdmin && onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(task);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition border border-zinc-800"
                >
                  Edit Task
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
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
    </>
  );
};
