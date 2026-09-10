import React, { useState, useEffect } from 'react';
import {
  Shield,
  LogOut,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  Lock,
  ListTodo,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useVocab } from '../../context/VocabContext';
import {
  formatDatePretty,
  getTodayDateString,
  getDeadlineInfo,
} from '../../utils/dateUtils';
import { ActiveView, PersonalTask, Subject, TaskPriority } from '../../types';

interface ProfileViewProps {
  setActiveView: (view: ActiveView) => void;
}

const LOCAL_STORAGE_PERSONAL_TASKS_PREFIX = 'prepdesk_personal_tasks_';

export const ProfileView: React.FC<ProfileViewProps> = ({ setActiveView }) => {
  const { user, switchRoleDemo, signOut, isAdmin, managedUsers } = useAuth();
  const { stats: taskStats } = useTasks();
  const { stats: vocabStats, testHistory } = useVocab();

  const userId = user?.uid || 'guest';
  const cacheKey = `${LOCAL_STORAGE_PERSONAL_TASKS_PREFIX}${userId}`;

  // Personal tasks state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(() => {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  // Personal task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState<Subject | 'General'>('General');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Normal');
  const [taskDeadline, setTaskDeadline] = useState(getTodayDateString());
  const [taskNotes, setTaskNotes] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  // Filter personal tasks
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Secure admin elevation modal state (for students)
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminModalError, setAdminModalError] = useState<string | null>(null);

  // Real-time Firestore sync for personal tasks
  useEffect(() => {
    if (!user?.uid) return;
    let unsubscribe: (() => void) | undefined;
    try {
      const personalRef = collection(db, 'users', user.uid, 'personalTasks');
      unsubscribe = onSnapshot(
        personalRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: PersonalTask[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() } as PersonalTask);
            });
            // Sort: pending first, then by deadline
            fetched.sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              return (a.deadlineDate || '') > (b.deadlineDate || '') ? 1 : -1;
            });
            setPersonalTasks(fetched);
            localStorage.setItem(cacheKey, JSON.stringify(fetched));
          } else {
            // Check local fallback
            const localSaved = localStorage.getItem(cacheKey);
            if (!localSaved) {
              setPersonalTasks([]);
            }
          }
        },
        (err) => {
          console.warn('Firestore personal tasks note:', err.message);
        }
      );
    } catch (e) {
      console.warn('Firestore personal tasks setup note:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, cacheKey]);

  // Handle Add Personal Task
  const handleCreatePersonalTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);

    if (!taskTitle.trim()) {
      setTaskFormError('Please enter a task title.');
      return;
    }

    const newId = `ptask_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const nowIso = new Date().toISOString();

    const newTask: PersonalTask = {
      id: newId,
      userId,
      title: taskTitle.trim(),
      notes: taskNotes.trim(),
      section: (taskSubject === 'QUANT' ? 'QUANTS' : taskSubject) as any || 'General',
      subject: taskSubject,
      deadlineDate: taskDeadline || getTodayDateString(),
      priority: taskPriority,
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newTask, ...personalTasks];
    setPersonalTasks(updated);
    localStorage.setItem(cacheKey, JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'users', userId, 'personalTasks', newId), newTask);
    } catch (err) {
      console.warn('Firestore personal task setDoc note:', err);
    }

    setTaskTitle('');
    setTaskNotes('');
    setIsAddingTask(false);
  };

  // Toggle Complete
  const handleToggleTask = async (task: PersonalTask) => {
    const updatedStatus = !task.completed;
    const nowIso = new Date().toISOString();

    const updatedTasks = personalTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            completed: updatedStatus,
            completedAt: updatedStatus ? nowIso : undefined,
            updatedAt: nowIso,
          }
        : t
    );

    // Re-sort: pending first
    updatedTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.deadlineDate || '') > (b.deadlineDate || '') ? 1 : -1;
    });

    setPersonalTasks(updatedTasks);
    localStorage.setItem(cacheKey, JSON.stringify(updatedTasks));

    try {
      await updateDoc(doc(db, 'users', userId, 'personalTasks', task.id), {
        completed: updatedStatus,
        completedAt: updatedStatus ? nowIso : null,
        updatedAt: nowIso,
      });
    } catch (err) {
      console.warn('Firestore update personal task note:', err);
    }
  };

  // Delete Personal Task
  const handleDeleteTask = async (taskId: string) => {
    const updated = personalTasks.filter((t) => t.id !== taskId);
    setPersonalTasks(updated);
    localStorage.setItem(cacheKey, JSON.stringify(updated));

    try {
      await fetch(`/api/db/personal-tasks/${taskId}?studentUid=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Backend delete personal task note:', err);
    }

    try {
      await deleteDoc(doc(db, 'users', userId, 'personalTasks', taskId));
    } catch (err) {
      console.warn('Firestore delete personal task note:', err);
    }
  };

  // Verify Admin Password for Role Elevation
  const handleVerifyAdminAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminModalError(null);

    const entered = adminPasswordInput.trim();
    // Validate against administrator credentials
    const validAdmin = entered === 'madhav07';

    if (validAdmin) {
      switchRoleDemo('admin');
      setAdminModalOpen(false);
      setAdminPasswordInput('');
    } else {
      setAdminModalError('Invalid administrator password. Access denied.');
    }
  };

  // Filtered tasks
  const filteredPersonalTasks = personalTasks.filter((t) => {
    if (taskFilter === 'PENDING') return !t.completed;
    if (taskFilter === 'COMPLETED') return t.completed;
    return true;
  });

  const completedCount = personalTasks.filter((t) => t.completed).length;
  const pendingCount = personalTasks.filter((t) => !t.completed).length;

  // Average test accuracy
  const avgAccuracy =
    testHistory.length > 0
      ? Math.round(
          testHistory.reduce((acc, t) => acc + t.accuracy, 0) / testHistory.length
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-emerald-400 flex items-center justify-center font-bold text-2xl tracking-tight shadow-sm shrink-0">
            {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'P'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {user?.displayName || 'PrepDesk Scholar'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isAdmin
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/[0.06] text-zinc-400 border-white/[0.08]'
                }`}
              >
                {isAdmin ? 'Administrator' : 'Student'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              ID: <strong className="text-zinc-200 font-mono">{user?.studentId || user?.displayName}</strong> &bull; {user?.email || 'student@prepdesk.edu'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Member since {formatDatePretty(user?.createdAt || new Date().toISOString())}</span>
              <span>&bull;</span>
              <a href="mailto:mmgajjar07@gmail.com" className="text-emerald-400 hover:underline font-medium">
                Support: mmgajjar07@gmail.com
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {user?.role === 'admin' ? (
            <button
              onClick={() => switchRoleDemo(isAdmin ? 'student' : 'admin')}
              className="btn-glass px-4 py-2 text-zinc-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAdmin ? 'Preview as Student' : 'Return to Admin Mode'}</span>
            </button>
          ) : (
            <button
              onClick={() => setAdminModalOpen(true)}
              className="btn-glass px-3.5 py-2 text-zinc-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              title="Requires administrator password"
            >
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Administrator Access</span>
            </button>
          )}

          <button
            onClick={signOut}
            className="btn-glass px-4 py-2 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/[0.08] text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. Preparation Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Class Tasks Done
          </span>
          <span className="text-3xl font-bold text-white mt-2 block tabular-nums">
            {taskStats.completed}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium tabular-nums">
            {taskStats.completionRate}% completion rate
          </span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Personal Targets
          </span>
          <span className="text-3xl font-bold text-white mt-2 block tabular-nums">
            {completedCount} / {personalTasks.length}
          </span>
          <span className="text-[11px] text-amber-400 font-medium tabular-nums">
            {pendingCount} pending today
          </span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Vault Vocabulary
          </span>
          <span className="text-3xl font-bold text-white mt-2 block tabular-nums">
            {vocabStats.total}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium tabular-nums">
            {vocabStats.confident} confident words
          </span>
        </div>

        <div className="p-5 glass-card rounded-2xl">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Avg Test Accuracy
          </span>
          <span className="text-3xl font-bold text-emerald-400 mt-2 block tabular-nums">
            {testHistory.length > 0 ? `${avgAccuracy}%` : 'N/A'}
          </span>
          <span className="text-[11px] text-zinc-500">Exam drill average</span>
        </div>
      </div>

      {/* 3. MY PERSONAL TASKS & STUDY TARGETS */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white tracking-tight text-lg">
                My Personal Tasks & Study Planner
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add your private daily revision goals, self-practice sets, and study milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-xl text-xs font-medium border border-white/[0.08]">
              <button
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'ALL'
                    ? 'bg-white/[0.14] text-white font-semibold border border-white/[0.20] shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({personalTasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'PENDING'
                    ? 'bg-white/[0.14] text-white font-semibold border border-white/[0.20] shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setTaskFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'COMPLETED'
                    ? 'bg-white/[0.14] text-white font-semibold border border-white/[0.20] shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>

            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="btn-primary-glass px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingTask ? 'Cancel' : 'Add Task'}</span>
            </button>
          </div>
        </div>

        {/* Add Personal Task Form */}
        {isAddingTask && (
          <form
            onSubmit={handleCreatePersonalTask}
            className="p-5 rounded-2xl glass-card space-y-4 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Create New Personal Task
              </span>
              <span className="text-[11px] text-zinc-500">Private to your account</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solve 3 RC passages from 2022 CAT slot 1, or Revise Quadratic Equations"
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-zinc-100 placeholder-zinc-500 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Subject Tag
                  </label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs glass-input text-zinc-200 rounded-xl"
                  >
                    <option value="General">General / All-round</option>
                    <option value="VARC">VARC</option>
                    <option value="DILR">DILR</option>
                    <option value="QUANT">QUANT</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs glass-input text-zinc-200 rounded-xl"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Target Deadline Date
                  </label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input text-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Optional Notes / Checklist
                </label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="e.g. Set timer for 30 minutes, focus on accuracy over speed"
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-zinc-100 placeholder-zinc-500 rounded-xl"
                />
              </div>
            </div>

            {taskFormError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{taskFormError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="btn-glass px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-glass px-5 py-1.5 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Personal Task</span>
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        <div className="space-y-2.5">
          {filteredPersonalTasks.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs rounded-2xl glass-card border-dashed border-white/[0.12] space-y-2">
              <ListTodo className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="font-semibold text-zinc-300">No personal tasks in this filter</p>
              <p className="text-[11px] text-zinc-500">
                Click "+ Add Task" above to plan your personal practice questions and revision checklist.
              </p>
            </div>
          ) : (
            filteredPersonalTasks.map((t) => {
              const deadlineInfo = t.deadlineDate ? getDeadlineInfo(t.deadlineDate, '23:59', t.completed) : null;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                    t.completed
                      ? 'glass-card opacity-60 border-white/[0.04]'
                      : 'glass-card hover:border-white/[0.16]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Toggle Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0"
                    >
                      {t.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold text-sm tracking-tight ${
                            t.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                          }`}
                        >
                          {t.title}
                        </span>

                        {/* Subject Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-md uppercase tracking-wider border ${
                            t.subject === 'VARC'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : t.subject === 'DILR'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : t.subject === 'QUANT'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/[0.06] text-zinc-300 border-white/[0.08]'
                          }`}
                        >
                          {t.subject || 'General'}
                        </span>

                        {/* Priority Badge */}
                        {t.priority !== 'Normal' && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-md uppercase tracking-wider border ${
                              t.priority === 'Urgent'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {t.priority}
                          </span>
                        )}
                      </div>

                      {t.notes && (
                        <p className="text-xs text-zinc-400 mt-1 leading-normal">
                          {t.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-zinc-500">
                        {t.deadlineDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Target: {formatDatePretty(t.deadlineDate)}
                          </span>
                        )}
                        {deadlineInfo && !t.completed && (
                          <span
                            className={`font-semibold ${
                              deadlineInfo.isOverdue
                                ? 'text-rose-400'
                                : deadlineInfo.isDueToday
                                ? 'text-amber-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            &bull; {deadlineInfo.badgeText}
                          </span>
                        )}
                        {t.completed && t.completedAt && (
                          <span className="text-emerald-400 font-medium">
                            &bull; Completed {formatDatePretty(t.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.06] transition shrink-0"
                    title="Delete personal task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Test History Log */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="font-bold text-white tracking-tight text-lg">Vocabulary Test History</h3>
            <p className="text-xs text-zinc-400">Record of your recent diagnostic tests and drills.</p>
          </div>

          <button
            onClick={() => setActiveView('vocab-test')}
            className="btn-primary-glass px-3.5 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Take Test</span>
          </button>
        </div>

        {testHistory.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            You have not taken any vocabulary tests yet. Start one to establish your baseline!
          </div>
        ) : (
          <div className="space-y-2.5">
            {testHistory.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white tracking-tight tabular-nums">
                      Score: {t.score} / {t.totalQuestions} ({t.accuracy}%)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-medium capitalize border border-white/[0.08]">
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                    Tested {t.wordsTested.length} words &bull; {t.incorrectWords.length} mistakes
                  </p>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 text-[11px] tabular-nums">
                  <span>{formatDatePretty(t.date)}</span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full border ${
                      t.accuracy >= 80
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : t.accuracy >= 60
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {t.accuracy}% Accuracy
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Password Verification Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-emerald-400 flex items-center justify-center font-bold mx-auto shadow-md">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Administrator Verification
              </h3>
              <p className="text-xs text-zinc-400">
                Enter the administrator password to switch into Admin mode.
              </p>
            </div>

            <form onSubmit={handleVerifyAdminAccess} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs glass-input text-zinc-100 placeholder-zinc-500 rounded-xl font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {adminModalError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{adminModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAdminModalOpen(false);
                    setAdminPasswordInput('');
                    setAdminModalError(null);
                  }}
                  className="btn-glass px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-glass px-5 py-2 font-semibold text-xs rounded-xl transition"
                >
                  Verify & Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
