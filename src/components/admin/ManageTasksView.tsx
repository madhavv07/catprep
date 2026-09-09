import React, { useState } from 'react';
import {
  PlusCircle,
  Search,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { ClassTask, Subject, TaskPublishStatus, ActiveView } from '../../types';
import { TaskCard } from '../tasks/TaskCard';

interface ManageTasksViewProps {
  setActiveView: (view: ActiveView) => void;
  onEditTask: (task: ClassTask) => void;
}

export const ManageTasksView: React.FC<ManageTasksViewProps> = ({
  setActiveView,
  onEditTask,
}) => {
  const { tasks, deleteAllTasks } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | Subject>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskPublishStatus>('ALL');

  const filteredTasks = tasks.filter((t) => {
    if (subjectFilter !== 'ALL' && t.subject !== subjectFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.shortDescription && t.shortDescription.toLowerCase().includes(q)) ||
        (t.givenInLecture && t.givenInLecture.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const publishedCount = tasks.filter((t) => t.status === 'published').length;
  const draftCount = tasks.filter((t) => t.status === 'draft').length;

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to permanently delete ALL class assignments from the database? This cannot be undone.')) {
      await deleteAllTasks();
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Administrator Controls
            </span>
            <span className="text-xs text-zinc-600">&bull;</span>
            <span className="text-xs text-zinc-400 font-medium">Assignment Control</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-100 tracking-tight mt-1">
            Manage Class Tasks
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Publish, edit, duplicate, or unpublish assignments across VARC, DILR, and Quant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Delete all class tasks from database"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete All Tasks</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('admin-create')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Class Tasks
          </span>
          <span className="text-xl font-serif font-bold text-zinc-100 mt-0.5 block">
            {tasks.length}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Live / Published
          </span>
          <span className="text-xl font-serif font-bold text-emerald-400 mt-0.5 block">
            {publishedCount}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Drafts
          </span>
          <span className="text-xl font-serif font-bold text-zinc-400 mt-0.5 block">
            {draftCount}
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search class assignments..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Subject Pills */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['ALL', 'VARC', 'DILR', 'QUANT'] as const).map((subj) => (
              <button
                key={subj}
                onClick={() => setSubjectFilter(subj)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  subjectFilter === subj
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-2xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['ALL', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition capitalize ${
                  statusFilter === st
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-2xs font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800/80 text-zinc-400">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="font-serif font-bold text-zinc-200 text-lg">No tasks found</p>
          <p className="text-xs text-zinc-500 mt-1">
            Change your filter or click "Create New Task" to publish an assignment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              showAdminControls={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
