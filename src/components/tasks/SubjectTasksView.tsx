import React, { useState } from 'react';
import {
  Search,
  CheckSquare,
  PlusCircle,
  BookOpen,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { Subject, ClassTask, ActiveView } from '../../types';
import { TaskCard } from './TaskCard';
import { getDeadlineInfo } from '../../utils/dateUtils';

interface SubjectTasksViewProps {
  subject?: Subject; // If undefined, represents 'My Tasks' across all subjects
  setActiveView: (view: ActiveView) => void;
  onEditTask?: (task: ClassTask) => void;
}

export const SubjectTasksView: React.FC<SubjectTasksViewProps> = ({
  subject,
  setActiveView,
  onEditTask,
}) => {
  const { tasks, taskProgress } = useTasks();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'DUE_TODAY' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'assigned'>('deadline');

  // Filter by subject if specified
  const subjectTasks = subject ? tasks.filter((t) => t.subject === subject) : tasks;

  // Title and subtitle
  const getHeaderInfo = () => {
    switch (subject) {
      case 'VARC':
        return {
          title: 'VARC Class Tasks',
          subtitle: 'Reading Comprehension drills, critical reasoning, and verbal assignments for CAT 2027.',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'DILR':
        return {
          title: 'DILR Class Tasks',
          subtitle: 'Data interpretation sets, logical games, grid arrangements, and caselets.',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'QUANT':
        return {
          title: 'Quant Class Tasks',
          subtitle: 'Arithmetic, Algebra, Geometry problem sets, and weekly speed tests.',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      default:
        return {
          title: 'My Task Tracker',
          subtitle: 'Personalized master task dashboard across all CAT preparation subjects.',
          badge: 'bg-zinc-900 text-zinc-300 border-zinc-800',
        };
    }
  };

  const header = getHeaderInfo();

  // Compute subject-specific stats
  const totalCount = subjectTasks.length;
  let completedCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;

  subjectTasks.forEach((t) => {
    const isDone = !!taskProgress[t.id];
    if (isDone) {
      completedCount++;
    } else {
      pendingCount++;
      const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, false);
      if (info.isOverdue) overdueCount++;
      if (info.isDueToday) dueTodayCount++;
    }
  });

  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered & sorted tasks
  const filtered = subjectTasks.filter((t) => {
    const isDone = !!taskProgress[t.id];
    const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, isDone);

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.shortDescription && t.shortDescription.toLowerCase().includes(q)) ||
        (t.givenInLecture && t.givenInLecture.toLowerCase().includes(q)) ||
        (t.submissionMethod && t.submissionMethod.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (statusFilter === 'PENDING') return !isDone;
    if (statusFilter === 'COMPLETED') return isDone;
    if (statusFilter === 'DUE_TODAY') return !isDone && info.isDueToday;
    if (statusFilter === 'OVERDUE') return !isDone && info.isOverdue;

    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'priority') {
      const pOrder = { Urgent: 0, Important: 1, Normal: 2 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    }
    if (sortBy === 'assigned') {
      return (b.assignedDate || '').localeCompare(a.assignedDate || '');
    }
    // Default deadline closest first
    return (a.deadlineDate || '').localeCompare(b.deadlineDate || '');
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${header.badge}`}>
              {subject || 'All Subjects'}
            </span>
            <span className="text-xs text-zinc-600">&bull;</span>
            <span className="text-xs text-zinc-400 font-medium">Class Assignments</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-100 tracking-tight mt-1">
            {header.title}
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
            {header.subtitle}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setActiveView('admin-create')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        )}
      </div>

      {/* 2. Quick Progress Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Total Tasks
          </span>
          <span className="text-xl font-serif font-bold text-zinc-100 mt-0.5 block">
            {totalCount}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">{completionPercentage}% completed</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Pending
          </span>
          <span className="text-xl font-serif font-bold text-zinc-300 mt-0.5 block">
            {pendingCount}
          </span>
          <span className="text-[11px] text-zinc-500">Need personal submission</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            Due Today
          </span>
          <span className="text-xl font-serif font-bold text-amber-400 mt-0.5 block">
            {dueTodayCount}
          </span>
          <span className="text-[11px] text-amber-500/80">Check lecture cutoff</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
            Overdue
          </span>
          <span className="text-xl font-serif font-bold text-rose-400 mt-0.5 block">
            {overdueCount}
          </span>
          <span className="text-[11px] text-rose-500/80">Past official deadline</span>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks, lecture numbers, or instructions..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status Pills */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'DUE_TODAY', label: `Due Today (${dueTodayCount})` },
              { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
              { id: 'COMPLETED', label: `Completed (${completedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === f.id
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-medium focus:outline-none focus:border-emerald-500/60"
          >
            <option value="deadline">Closest Deadline</option>
            <option value="priority">Priority First</option>
            <option value="assigned">Recently Assigned</option>
          </select>
        </div>
      </div>

      {/* 4. Task Cards List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800/80 text-zinc-400 space-y-2">
          <CheckSquare className="w-10 h-10 text-zinc-700 mx-auto" />
          <p className="font-serif font-bold text-zinc-200 text-lg">No tasks match your filter</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm
              ? `No assignments matching "${searchTerm}". Try broadening your search query.`
              : 'You have no assignments under this status. Great job staying on top of your preparation!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} showAdminControls={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
};
