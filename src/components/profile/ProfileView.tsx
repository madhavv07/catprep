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
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-2xl font-serif shadow-xs shrink-0">
            {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'P'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-100">
                {user?.displayName || 'PrepDesk Scholar'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isAdmin
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {isAdmin ? 'Administrator' : 'Student'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Username: <strong className="text-zinc-200 font-mono">{user?.username || 'student'}</strong> &bull; {user?.email || 'student@prepdesk.edu'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Member since {formatDatePretty(user?.createdAt || new Date().toISOString())}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Role Switching Control:
              - If user is base admin: allowed to toggle between Student view and Admin view freely
              - If user is base student: require admin password verification to prevent unauthorized switching! */}
          {user?.role === 'admin' ? (
            <button
              onClick={() => switchRoleDemo(isAdmin ? 'student' : 'admin')}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-zinc-800"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAdmin ? 'Preview as Student' : 'Return to Admin Mode'}</span>
            </button>
          ) : (
            <button
              onClick={() => setAdminModalOpen(true)}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-zinc-800"
              title="Requires administrator password"
            >
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Administrator Access</span>
            </button>
          )}

          <button
            onClick={signOut}
            className="px-4 py-2 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-rose-800/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. Preparation Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
            Class Tasks Done
          </span>
          <span className="text-3xl font-serif font-bold text-zinc-100 mt-2 block">
            {taskStats.completed}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">
            {taskStats.completionRate}% completion rate
          </span>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
            Personal Targets
          </span>
          <span className="text-3xl font-serif font-bold text-zinc-100 mt-2 block">
            {completedCount} / {personalTasks.length}
          </span>
          <span className="text-[11px] text-amber-400 font-medium">
            {pendingCount} pending today
          </span>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
            Vault Vocabulary
          </span>
          <span className="text-3xl font-serif font-bold text-zinc-100 mt-2 block">
            {vocabStats.total}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">
            {vocabStats.confident} confident words
          </span>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-2xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
            Avg Test Accuracy
          </span>
          <span className="text-3xl font-serif font-bold text-emerald-400 mt-2 block">
            {testHistory.length > 0 ? `${avgAccuracy}%` : 'N/A'}
          </span>
          <span className="text-[11px] text-zinc-500">Exam drill average</span>
        </div>
      </div>

      {/* 3. MY PERSONAL TASKS & STUDY TARGETS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-emerald-400" />
              <h3 className="font-serif font-bold text-zinc-100 text-lg">
                My Personal Tasks & Study Planner
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add your private daily revision goals, self-practice sets, and study milestones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-900 p-1 rounded-xl text-xs font-medium border border-zinc-800">
              <button
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'ALL'
                    ? 'bg-zinc-800 text-emerald-400 font-semibold border border-emerald-500/30 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({personalTasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'PENDING'
                    ? 'bg-zinc-800 text-emerald-400 font-semibold border border-emerald-500/30 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setTaskFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg transition ${
                  taskFilter === 'COMPLETED'
                    ? 'bg-zinc-800 text-emerald-400 font-semibold border border-emerald-500/30 shadow-2xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>

            <button
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0"
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
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
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
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
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
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
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
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
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
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
                />
              </div>
            </div>

            {taskFormError && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{taskFormError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
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
            <div className="p-8 text-center text-zinc-500 text-xs rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-2">
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
                      ? 'bg-zinc-950/80 border-zinc-900 opacity-60'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 shadow-2xs'
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
                          className={`font-serif font-bold text-sm tracking-tight ${
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
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
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
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-900 transition shrink-0"
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
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="font-serif font-bold text-zinc-100 text-lg">Vocabulary Test History</h3>
            <p className="text-xs text-zinc-400">Record of your recent diagnostic tests and drills.</p>
          </div>

          <button
            onClick={() => setActiveView('vocab-test')}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
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
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100 font-serif">
                      Score: {t.score} / {t.totalQuestions} ({t.accuracy}%)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium capitalize border border-zinc-750">
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Tested {t.wordsTested.length} words &bull; {t.incorrectWords.length} mistakes
                  </p>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                  <span>{formatDatePretty(t.date)}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full border ${
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-zinc-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold font-serif mx-auto shadow-md">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif font-bold text-zinc-100">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 font-mono transition"
                    autoFocus
                  />
                </div>
              </div>

              {adminModalError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
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
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition shadow-xs"
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
