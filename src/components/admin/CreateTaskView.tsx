import React, { useState, useEffect } from 'react';
import {
  Send,
  AlertCircle,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { ClassTask, Subject, TaskPriority, TaskPublishStatus, ActiveView } from '../../types';
import { getTodayDateString } from '../../utils/dateUtils';

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
  const { createTask, updateTask } = useTasks();

  const [subject, setSubject] = useState<Subject>(taskToEdit?.subject || 'VARC');
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setSubject(taskToEdit.subject);
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
    }
  }, [taskToEdit]);

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

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          subject,
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
        });
      } else {
        await createTask({
          subject,
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
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <button
            onClick={onDone}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Manage Tasks
          </button>
          <h2 className="text-2xl font-serif font-bold text-zinc-100">
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
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition"
          >
            Save as Draft
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
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
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-xs space-y-5">
        {/* Subject & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Subject Category *
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500/60"
            >
              <option value="VARC">VARC (Verbal Ability & Reading Comp)</option>
              <option value="DILR">DILR (Data Interpretation & Logical Reasoning)</option>
              <option value="QUANT">QUANT (Quantitative Aptitude)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500/60"
            >
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Urgent">Urgent (Red Alert)</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Read Aeon Essay 'The Limits of Epistemology' & 3 RC Questions"
            className="w-full p-2.5 text-sm bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl font-serif focus:outline-none focus:border-emerald-500/60 transition"
          />
        </div>

        {/* Short description */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Short Summary / Preview
          </label>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Brief 1-line overview shown on student cards..."
            className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
          />
        </div>

        {/* Detailed Instructions */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Full Instructions & Problem Numbers
          </label>
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Provide step-by-step instructions, question numbers from handout, or reading guidance..."
            className="w-full p-3 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl leading-relaxed focus:outline-none focus:border-emerald-500/60 transition font-sans"
          />
        </div>

        {/* Lecture & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Given In Lecture
            </label>
            <input
              type="text"
              value={givenInLecture}
              onChange={(e) => setGivenInLecture(e.target.value)}
              placeholder="e.g. Lecture 12 (Critical Reasoning)"
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Assigned Date
            </label>
            <input
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Deadline Date *
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* Deadline Time & Submission Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Deadline Time (24h format)
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Submission Method / Medium
            </label>
            <input
              type="text"
              value={submissionMethod}
              onChange={(e) => setSubmissionMethod(e.target.value)}
              placeholder="e.g. Handwritten notebook in class, or Portal upload"
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* Target Submission Lecture & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Target Submission Lecture (Optional)
            </label>
            <input
              type="text"
              value={submissionLecture}
              onChange={(e) => setSubmissionLecture(e.target.value)}
              placeholder="e.g. Start of Lecture 14"
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Publish Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskPublishStatus)}
              className="w-full p-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl font-medium focus:outline-none focus:border-emerald-500/60"
            >
              <option value="published">Published (Visible to all students)</option>
              <option value="draft">Draft (Admin only)</option>
            </select>
          </div>
        </div>

        {/* Admin Advisory Notes */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Admin Advisory / Guidance Notes
          </label>
          <textarea
            rows={2}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g. Time yourself strictly to 45 mins. Bring rough work notes to discussion."
            className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl leading-relaxed focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      </div>
    </div>
  );
};
