import React, { useState, useEffect } from 'react';
import {
  Send,
  AlertCircle,
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  BookOpen,
  FileText,
  Upload,
  X,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import {
  ClassTask,
  Subject,
  TaskPriority,
  TaskPublishStatus,
  ActiveView,
  PdfAttachment,
  ScheduleActivity,
} from '../../types';
import { getTodayDateString, formatDatePretty } from '../../utils/dateUtils';
import { PdfViewerModal } from '../common/PdfViewerModal';

interface CreateTaskViewProps {
  taskToEdit?: ClassTask | null;
  onDone: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const CreateTaskView: React.FC<CreateTaskViewProps> = ({
  taskToEdit,
  onDone,
  setActiveView,
}) => {
  const { createTask, updateTask, scheduleActivities } = useTasks();

  const [subject, setSubject] = useState<Subject>(taskToEdit?.subject || 'VARC');
  const [topic, setTopic] = useState(taskToEdit?.topic || '');
  const [subtopic, setSubtopic] = useState(taskToEdit?.subtopic || '');
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [shortDescription, setShortDescription] = useState(taskToEdit?.shortDescription || '');
  const [instructions, setInstructions] = useState(taskToEdit?.instructions || '');
  const [givenInLecture, setGivenInLecture] = useState(taskToEdit?.givenInLecture || '');
  const [assignedDate, setAssignedDate] = useState(taskToEdit?.assignedDate || getTodayDateString());
  const [deadlineDate, setDeadlineDate] = useState(taskToEdit?.deadlineDate || getTodayDateString());
  const [deadlineTime, setDeadlineTime] = useState(taskToEdit?.deadlineTime || '23:59');
  const [submissionDate, setSubmissionDate] = useState(taskToEdit?.submissionDate || '');
  const [submissionLecture, setSubmissionLecture] = useState(taskToEdit?.submissionLecture || '');
  const [submissionMethod, setSubmissionMethod] = useState(
    taskToEdit?.submissionMethod || 'Submit in Lecture / Physical Notebook'
  );
  const [additionalNotes, setAdditionalNotes] = useState(taskToEdit?.additionalNotes || '');
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority || 'Normal');
  const [status, setStatus] = useState<TaskPublishStatus>(taskToEdit?.status || 'published');

  // Timetable quick selection states
  const [assignedMode, setAssignedMode] = useState<'timetable' | 'custom'>('timetable');
  const [deadlineMode, setDeadlineMode] = useState<'timetable' | 'custom'>('timetable');
  const [selectedAssignedActId, setSelectedAssignedActId] = useState('');
  const [selectedDeadlineActId, setSelectedDeadlineActId] = useState('');

  // PDF Attachment State
  const [pdfAttachment, setPdfAttachment] = useState<PdfAttachment | undefined>(taskToEdit?.pdfAttachment);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [previewPdfModal, setPreviewPdfModal] = useState<PdfAttachment | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setSubject(taskToEdit.subject || (taskToEdit.section as any) || 'VARC');
      setTopic(taskToEdit.topic || '');
      setSubtopic(taskToEdit.subtopic || '');
      setTitle(taskToEdit.title);
      setShortDescription(taskToEdit.shortDescription);
      setInstructions(taskToEdit.instructions);
      setGivenInLecture(taskToEdit.givenInLecture);
      setAssignedDate(taskToEdit.assignedDate);
      setDeadlineDate(taskToEdit.deadlineDate);
      setDeadlineTime(taskToEdit.deadlineTime || '23:59');
      setSubmissionDate(taskToEdit.submissionDate || '');
      setSubmissionLecture(taskToEdit.submissionLecture || '');
      setSubmissionMethod(taskToEdit.submissionMethod);
      setAdditionalNotes(taskToEdit.additionalNotes || '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setPdfAttachment(taskToEdit.pdfAttachment);
    }
  }, [taskToEdit]);

  // Handle Assigned Lecture Selection
  const handleSelectAssignedLecture = (activityId: string) => {
    setSelectedAssignedActId(activityId);
    if (!activityId) return;

    const act = scheduleActivities.find((a) => a.id === activityId);
    if (!act) return;

    const lectureLabel = `${act.subtopicCode} (${act.topic})`;
    setGivenInLecture(lectureLabel);
    setAssignedDate(act.date);
    if (!topic) setTopic(act.topic);
    if (!subtopic) setSubtopic(act.subtopicCode);

    // Sync subject
    if (act.section === 'VARC') setSubject('VARC');
    else if (act.section === 'DILR') setSubject('DILR');
    else if (act.section === 'QUANTS') setSubject('QUANT');
  };

  // Handle Deadline Lecture Selection
  const handleSelectDeadlineLecture = (activityId: string) => {
    setSelectedDeadlineActId(activityId);
    if (!activityId) return;

    const act = scheduleActivities.find((a) => a.id === activityId);
    if (!act) return;

    const deadlineLabel = `Start of ${act.subtopicCode} (${act.topic})`;
    setSubmissionLecture(deadlineLabel);
    setDeadlineDate(act.date);
    setDeadlineTime(act.startTime || '16:00');
  };

  // PDF File Upload Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfUploadError('Please select a valid PDF file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setPdfUploadError('PDF exceeds the 25MB maximum limit.');
      return;
    }

    setIsUploadingPdf(true);
    setPdfUploadError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Content = reader.result as string;
          const res = await fetch('/api/db/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              data: base64Content,
            }),
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          const data = await res.json();
          setPdfAttachment({
            name: data.name || file.name,
            url: data.url,
            sizeFormatted: data.sizeFormatted || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            sizeBytes: data.sizeBytes || file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (uploadErr: any) {
          // Fallback to local base64 URL if server endpoint has an issue
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          setPdfAttachment({
            name: file.name,
            url: reader.result as string,
            sizeFormatted: `${sizeMb} MB`,
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } finally {
          setIsUploadingPdf(false);
        }
      };
      reader.onerror = () => {
        setPdfUploadError('Failed to read PDF file.');
        setIsUploadingPdf(false);
      };
    } catch (err: any) {
      setPdfUploadError(err?.message || 'Error processing file.');
      setIsUploadingPdf(false);
    }
  };

  const handleSubmit = async (publishImmediate: boolean = false) => {
    if (!title.trim()) {
      setError('Please provide a task title.');
      return;
    }
    if (!deadlineDate) {
      setError('Please specify a deadline date.');
      return;
    }

    setError(null);
    setSaving(true);

    const finalStatus = publishImmediate ? 'published' : status;
    const catSection = subject === 'QUANT' ? 'QUANTS' : (subject as 'VARC' | 'DILR');

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          section: catSection,
          subject,
          topic: topic.trim() || title.trim(),
          subtopic: subtopic.trim() || 'Core',
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          instructions: instructions.trim(),
          givenInLecture: givenInLecture.trim(),
          assignedDate,
          deadlineDate,
          deadlineTime,
          submissionDate: submissionDate || undefined,
          submissionLecture: submissionLecture || undefined,
          submissionMethod: submissionMethod.trim(),
          additionalNotes: additionalNotes.trim() || undefined,
          priority,
          status: finalStatus,
          pdfAttachment: pdfAttachment || undefined,
        });
      } else {
        await createTask({
          section: catSection,
          subject,
          topic: topic.trim() || title.trim(),
          subtopic: subtopic.trim() || 'Core',
          title: title.trim(),
          shortDescription: shortDescription.trim(),
          instructions: instructions.trim(),
          givenInLecture: givenInLecture.trim(),
          assignedDate,
          deadlineDate,
          deadlineTime,
          submissionDate: submissionDate || undefined,
          submissionLecture: submissionLecture || undefined,
          submissionMethod: submissionMethod.trim(),
          additionalNotes: additionalNotes.trim() || undefined,
          priority,
          status: finalStatus,
          pdfAttachment: pdfAttachment || undefined,
        });
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onDone();
        setActiveView('admin-manage');
      }, 800);
    } catch (e: any) {
      setError(e?.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <button
            onClick={onDone}
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 mb-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Manage Tasks
          </button>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {taskToEdit ? 'Edit Class Task' : 'Publish New Class Task'}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Published tasks will appear immediately on every student's dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="btn-glass px-4 py-2 text-xs font-medium rounded-xl text-zinc-300 hover:text-white cursor-pointer"
          >
            Save as Draft
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="btn-primary-glass px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved!
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Publish to Class
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-2xl space-y-6">
        {/* Subject & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Subject Category *
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="glass-input w-full p-2.5 text-xs rounded-xl font-medium cursor-pointer"
            >
              <option value="VARC">VARC (Verbal Ability & Reading Comp)</option>
              <option value="DILR">DILR (Data Interpretation & Logical Reasoning)</option>
              <option value="QUANT">QUANT (Quantitative Aptitude)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="glass-input w-full p-2.5 text-xs rounded-xl font-medium cursor-pointer"
            >
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Urgent">Urgent (Red Alert)</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Read Aeon Essay 'The Limits of Epistemology' & 3 RC Questions"
            className="glass-input w-full p-2.5 text-sm font-semibold rounded-xl"
          />
        </div>

        {/* Topic & Subtopic code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Topic / Theme
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Critical Reasoning, Percentages, Circular Arrangements"
              className="glass-input w-full p-2.5 text-xs rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Subtopic Code (Optional)
            </label>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="e.g. VA 1.2, QA 1.5A, LR 2.1"
              className="glass-input w-full p-2.5 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Short description */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Short Summary / Preview
          </label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Brief 1-line overview shown on student cards..."
            className="glass-input w-full p-2.5 text-xs rounded-xl"
          />
        </div>

        {/* Detailed Instructions (Supports Links!) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Full Instructions & Study Links
            </label>
            <span className="text-[11px] text-zinc-500">
              💡 Paste Drive, YouTube, or article URLs here to create rich interactive cards!
            </span>
          </div>
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Provide step-by-step instructions, question numbers from handout, or paste resource links like Google Drive sheets or YouTube lectures..."
            className="glass-input w-full p-3 text-xs rounded-xl leading-relaxed select-text"
          />
        </div>

        {/* SMART TIMETABLE INTEGRATION: Assigned in Lecture Picker */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              1. Assigned In Lecture / Date
            </label>
            <div className="flex items-center gap-1 text-[11px] bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setAssignedMode('timetable')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  assignedMode === 'timetable'
                    ? 'bg-white/[0.12] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Select from Timetable
              </button>
              <button
                type="button"
                onClick={() => setAssignedMode('custom')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  assignedMode === 'custom'
                    ? 'bg-white/[0.12] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {assignedMode === 'timetable' ? (
            <div>
              <select
                value={selectedAssignedActId}
                onChange={(e) => handleSelectAssignedLecture(e.target.value)}
                className="glass-input w-full p-2.5 text-xs rounded-xl cursor-pointer"
              >
                <option value="">-- Choose Scheduled Class Lecture --</option>
                {scheduleActivities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.date} ({act.day.slice(0, 3)}) | [{act.section}] {act.subtopicCode}: {act.topic}
                  </option>
                ))}
              </select>
              {givenInLecture && (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Assigned in: {givenInLecture} (Date: {assignedDate})
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Lecture Name / Description</span>
                <input
                  type="text"
                  value={givenInLecture}
                  onChange={(e) => setGivenInLecture(e.target.value)}
                  placeholder="e.g. Lecture 12 (Critical Reasoning)"
                  className="glass-input w-full p-2 text-xs rounded-xl"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Assigned Date</span>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="glass-input w-full p-2 text-xs rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* SMART TIMETABLE INTEGRATION: Deadline & Target Lecture Picker */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              2. Deadline & Target Submission Lecture *
            </label>
            <div className="flex items-center gap-1 text-[11px] bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDeadlineMode('timetable')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  deadlineMode === 'timetable'
                    ? 'bg-white/[0.12] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Target Class Lecture
              </button>
              <button
                type="button"
                onClick={() => setDeadlineMode('custom')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  deadlineMode === 'custom'
                    ? 'bg-white/[0.12] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Custom Date/Time
              </button>
            </div>
          </div>

          {deadlineMode === 'timetable' ? (
            <div className="space-y-3">
              <select
                value={selectedDeadlineActId}
                onChange={(e) => handleSelectDeadlineLecture(e.target.value)}
                className="glass-input w-full p-2.5 text-xs rounded-xl cursor-pointer"
              >
                <option value="">-- Choose Target Class for Deadline --</option>
                {scheduleActivities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.date} ({act.day.slice(0, 3)}) | [{act.section}] {act.subtopicCode}: {act.topic}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">Deadline Date</span>
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="glass-input w-full p-2 text-xs rounded-xl tabular-nums"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">Deadline Time (24h)</span>
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="glass-input w-full p-2 text-xs rounded-xl tabular-nums"
                  />
                </div>
              </div>

              {submissionLecture && (
                <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Submission expected at: {submissionLecture} ({deadlineDate})
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Deadline Date *</span>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="glass-input w-full p-2 text-xs rounded-xl tabular-nums"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Deadline Time (24h)</span>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="glass-input w-full p-2 text-xs rounded-xl tabular-nums"
                />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Target Lecture (Optional)</span>
                <input
                  type="text"
                  value={submissionLecture}
                  onChange={(e) => setSubmissionLecture(e.target.value)}
                  placeholder="e.g. Start of Lecture 14"
                  className="glass-input w-full p-2 text-xs rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* PDF ATTACHMENT SECTION */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            3. Attach PDF Handout / Worksheet (Optional)
          </label>

          {pdfAttachment ? (
            <div className="p-3.5 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-100 truncate">{pdfAttachment.name}</p>
                  <span className="text-[10px] text-zinc-400 font-mono tabular-nums">{pdfAttachment.sizeFormatted}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewPdfModal(pdfAttachment)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPdfAttachment(undefined)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="border border-dashed border-white/[0.12] hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-zinc-400" />
                <div className="text-center">
                  <span className="text-xs font-semibold text-zinc-300 block">
                    {isUploadingPdf ? 'Uploading PDF...' : 'Click or drop PDF handout to attach'}
                  </span>
                  <span className="text-[11px] text-zinc-500">Up to 25MB • Students can view in-app</span>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isUploadingPdf}
                  className="hidden"
                />
              </label>
              {pdfUploadError && (
                <p className="text-[11px] text-rose-400 mt-1.5">{pdfUploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Submission Method & Publish Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Submission Method / Medium
            </label>
            <input
              type="text"
              value={submissionMethod}
              onChange={(e) => setSubmissionMethod(e.target.value)}
              placeholder="e.g. Handwritten notebook in class, or Portal upload"
              className="glass-input w-full p-2.5 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Publish Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskPublishStatus)}
              className="glass-input w-full p-2.5 text-xs rounded-xl font-medium cursor-pointer"
            >
              <option value="published">Published (Visible to all students)</option>
              <option value="draft">Draft (Admin only)</option>
            </select>
          </div>
        </div>

        {/* Admin Guidance Notes */}
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Admin Advisory / Guidance Notes
          </label>
          <textarea
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g. Time yourself strictly to 45 mins. Bring rough work notes to discussion."
            className="glass-input w-full p-2.5 text-xs rounded-xl leading-relaxed"
          />
        </div>
      </div>

      {/* PDF Viewer Preview Modal */}
      {previewPdfModal && (
        <PdfViewerModal
          isOpen={true}
          onClose={() => setPreviewPdfModal(null)}
          pdfUrl={previewPdfModal.url}
          title={previewPdfModal.name}
          fileSizeFormatted={previewPdfModal.sizeFormatted}
        />
      )}
    </div>
  );
};
