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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Administrator Controls
            </span>
            <span className="text-xs text-zinc-600">&bull;</span>
            <span className="text-xs text-zinc-400 font-medium">Assignment Control</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
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
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Delete all class tasks from database"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete All Tasks</span>
            </button>
          )}

          <button
            onClick={() => setActiveView('admin-create')}
            className="btn-primary-glass px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="glass-card grid grid-cols-3 gap-3 p-4 rounded-2xl border border-white/[0.08]">
        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Total Class Tasks
          </span>
          <span className="text-2xl font-bold text-white tracking-tight tabular-nums mt-0.5 block">
            {tasks.length}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Live / Published
          </span>
          <span className="text-2xl font-bold text-emerald-400 tracking-tight tabular-nums mt-0.5 block">
            {publishedCount}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Drafts
          </span>
          <span className="text-2xl font-bold text-zinc-400 tracking-tight tabular-nums mt-0.5 block">
            {draftCount}
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search class assignments..."
            className="glass-input w-full pl-9 pr-4 py-2 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Subject Pills */}
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            {(['ALL', 'VARC', 'DILR', 'QUANT'] as const).map((subj) => (
              <button
                key={subj}
                onClick={() => setSubjectFilter(subj)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  subjectFilter === subj
                    ? 'bg-white/[0.14] text-white border border-white/[0.18] shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            {(['ALL', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white/[0.14] text-white border border-white/[0.18] shadow-xs font-semibold'
                    : 'text-zinc-400 hover:text-white'
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
        <div className="p-12 text-center rounded-3xl glass-card border border-white/[0.08] text-zinc-400 space-y-2">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="font-semibold text-white text-base">No tasks found</p>
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
