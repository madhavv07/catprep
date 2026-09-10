import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './AuthContext';
import {
  ClassTask,
  CATSection,
  Subject,
  TaskPriority,
  TaskPublishStatus,
  PersonalTask,
  TaskAssignment,
  DeadlineState,
  ScheduleActivity,
} from '../types';
import { CANONICAL_CAT_TASKS, CANONICAL_CAT_SCHEDULE } from '../data/seedData';
import { getDeadlineInfo, getDueSoonInfo, getTodayDateString } from '../utils/dateUtils';

interface TaskContextType {
  tasks: ClassTask[];
  taskProgress: Record<string, boolean>; // taskId -> completed
  taskAssignments: Record<string, TaskAssignment>;
  personalTasks: PersonalTask[];
  scheduleActivities: ScheduleActivity[];
  loading: boolean;

  // Schedule activity methods
  updateScheduleActivity: (id: string, updates: Partial<ScheduleActivity>) => Promise<void>;
  
  // General Task methods
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  createTask: (task: Omit<ClassTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateTask: (taskId: string, updates: Partial<ClassTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  duplicateTask: (task: ClassTask) => Promise<string>;
  publishTask: (taskId: string) => Promise<void>;
  unpublishTask: (taskId: string) => Promise<void>;

  // Personal Task methods
  createPersonalTask: (task: {
    title: string;
    section: CATSection | 'General';
    priority: TaskPriority;
    deadlineDate: string;
    deadlineTime?: string;
    notes?: string;
  }) => Promise<string>;
  updatePersonalTask: (taskId: string, updates: Partial<PersonalTask>) => Promise<void>;
  deletePersonalTask: (taskId: string) => Promise<void>;
  togglePersonalTask: (taskId: string) => Promise<void>;

  // Computed statistics for current student
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    dueSoon24h: number;
    completionRate: number;
    urgentPending: number;
    personalTotal: number;
    personalCompleted: number;
    personalPending: number;
  };

  // Filter helpers
  getTasksBySection: (section: CATSection) => ClassTask[];
  getTasksBySubject: (subject: Subject) => ClassTask[]; // compatibility
  getPendingTasks: () => ClassTask[];
  getOverdueTasks: () => ClassTask[];
  getDueTodayTasks: () => ClassTask[];
  getDueIn24HoursTasks: () => ClassTask[];
  getTaskDeadlineState: (task: ClassTask) => DeadlineState;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const LOCAL_STORAGE_TASKS_KEY = 'prepdesk_cached_tasks_v2';
const LOCAL_STORAGE_PERSONAL_TASKS_KEY = 'prepdesk_cached_personal_tasks_v2';
const LOCAL_STORAGE_PROGRESS_KEY_PREFIX = 'prepdesk_progress_v2_';

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const currentUid = user?.uid || 'guest';

  // 1. General Tasks State (Starts empty with 0 demo tasks)
  const [tasks, setTasks] = useState<ClassTask[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // 2. Personal Tasks State (strictly isolated by student UID)
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PERSONAL_TASKS_KEY}_${currentUid}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // 3. Task Progress Map (taskId -> boolean)
  const [taskProgress, setTaskProgress] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PROGRESS_KEY_PREFIX}${currentUid}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // 4. Detailed Task Assignments Map
  const [taskAssignments, setTaskAssignments] = useState<Record<string, TaskAssignment>>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Student State Isolation: Whenever active user changes, immediately isolate state!
  useEffect(() => {
    if (!user?.uid) {
      setTaskProgress({});
      setTaskAssignments({});
      setPersonalTasks([]);
      return;
    }

    const progressKey = `${LOCAL_STORAGE_PROGRESS_KEY_PREFIX}${user.uid}`;
    const savedProgress = localStorage.getItem(progressKey);
    if (savedProgress) {
      try {
        setTaskProgress(JSON.parse(savedProgress));
      } catch (e) {
        setTaskProgress({});
      }
    } else {
      setTaskProgress({});
    }

    const personalKey = `${LOCAL_STORAGE_PERSONAL_TASKS_KEY}_${user.uid}`;
    const savedPersonal = localStorage.getItem(personalKey);
    if (savedPersonal) {
      try {
        setPersonalTasks(JSON.parse(savedPersonal));
      } catch (e) {
        setPersonalTasks([]);
      }
    } else {
      setPersonalTasks([]);
    }
  }, [user?.uid]);

  const SHADOW_VAULT_KEY = 'prepdesk_shadow_vault';

  // Database sync helper functions with Dual-Resilience Auto-Rehydration
  const fetchTasksFromDb = async () => {
    try {
      const res = await fetch('/api/db/tasks');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          // If server was wiped (e.g. fresh Render deploy) but shadow vault has tasks
          const rawVault = localStorage.getItem(SHADOW_VAULT_KEY);
          let cachedTasks: ClassTask[] = [];
          if (rawVault) {
            try {
              const parsed = JSON.parse(rawVault);
              if (Array.isArray(parsed.tasks)) cachedTasks = parsed.tasks;
            } catch (e) {}
          }

          if (list.length === 0 && cachedTasks.length > 0) {
            console.log(`[AutoRehydration] Server restarted empty. Rehydrating ${cachedTasks.length} tasks from shadow vault...`);
            await fetch('/api/db/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tasks: cachedTasks }),
            });
            setTasks(cachedTasks);
            localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(cachedTasks));
            return;
          }

          setTasks(list);
          localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(list));
          localStorage.setItem(SHADOW_VAULT_KEY, JSON.stringify({ tasks: list, updatedAt: new Date().toISOString() }));
        }
      }
    } catch (e) {}
  };

  const fetchPersonalTasksFromDb = async (uid: string) => {
    try {
      const res = await fetch(`/api/db/personal-tasks?studentUid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setPersonalTasks(list);
          localStorage.setItem(`${LOCAL_STORAGE_PERSONAL_TASKS_KEY}_${uid}`, JSON.stringify(list));
        }
      }
    } catch (e) {}
  };

  const fetchAssignmentsFromDb = async (uid: string) => {
    try {
      const res = await fetch(`/api/db/assignments?studentUid=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const assignmentsMap = await res.json();
        const progressMap: Record<string, boolean> = {};
        for (const [tId, assign] of Object.entries(assignmentsMap)) {
          progressMap[tId] = (assign as any).status === 'COMPLETED';
        }
        setTaskAssignments(assignmentsMap);
        setTaskProgress(progressMap);
        localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY_PREFIX}${uid}`, JSON.stringify(progressMap));
      }
    } catch (e) {}
  };

  // Real-Time Dynamic Database & SSE Listener
  useEffect(() => {
    fetchTasksFromDb();

    if (user?.uid) {
      fetchPersonalTasksFromDb(user.uid);
      fetchAssignmentsFromDb(user.uid);
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'ALL_TASKS_DELETED') {
            setTasks([]);
            setTaskAssignments({});
            setTaskProgress({});
            localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify([]));
            localStorage.setItem(SHADOW_VAULT_KEY, JSON.stringify({ tasks: [], updatedAt: new Date().toISOString() }));
            return;
          }
          if (parsed.type === 'TASK_DELETED' && parsed.payload?.id) {
            setTasks((prev) => {
              const next = prev.filter((t) => t.id !== parsed.payload.id);
              localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(next));
              localStorage.setItem(SHADOW_VAULT_KEY, JSON.stringify({ tasks: next, updatedAt: new Date().toISOString() }));
              return next;
            });
            return;
          }
          if (
            parsed.type === 'TASK_CREATED' ||
            parsed.type === 'TASK_UPDATED' ||
            parsed.type === 'DATABASE_RESET' ||
            parsed.type === 'DATABASE_RESTORED'
          ) {
            fetchTasksFromDb();
          }
          if (parsed.type === 'PERSONAL_TASK_UPDATED') {
            if (user?.uid && parsed.payload?.studentUid === user.uid) {
              fetchPersonalTasksFromDb(user.uid);
            }
          }
          if (parsed.type === 'ASSIGNMENT_UPDATED') {
            if (user?.uid && parsed.payload?.studentUid === user.uid) {
              fetchAssignmentsFromDb(user.uid);
            }
          }
        } catch (e) {}
      });
    } catch (e) {}

    // Real-time personal tasks sync (if user logged in)
    try {
      let unsubPersonal: (() => void) | null = null;
      if (user?.uid) {
        const personalTasksRef = collection(db, 'users', user.uid, 'personalTasks');
        unsubPersonal = onSnapshot(
          personalTasksRef,
          (snapshot) => {
            const fetched: PersonalTask[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() } as PersonalTask);
            });
            if (fetched.length > 0) {
              setPersonalTasks(fetched);
            }
          },
          () => {}
        );
      }

      return () => {
        if (unsubPersonal) unsubPersonal();
        if (eventSource) eventSource.close();
      };
    } catch (err) {
      return () => {
        if (eventSource) eventSource.close();
      };
    }
  }, [user?.uid]);

  // 5. Schedule Activities State (Canonical B-CAT2701)
  const [scheduleActivities, setScheduleActivities] = useState<ScheduleActivity[]>(CANONICAL_CAT_SCHEDULE);

  // Sync scheduleActivities from Firestore
  useEffect(() => {
    try {
      const schedRef = collection(db, 'scheduleActivities');
      const unsubscribe = onSnapshot(
        schedRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ScheduleActivity[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as ScheduleActivity);
            });
            list.sort((a, b) => (a.date > b.date ? 1 : -1));
            setScheduleActivities(list);
          } else {
            setScheduleActivities(CANONICAL_CAT_SCHEDULE);
          }
        },
        (error) => {
          console.warn('Firestore schedule listener note:', error.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Could not attach schedule listener:', e);
    }
  }, []);

  const updateScheduleActivity = async (id: string, updates: Partial<ScheduleActivity>) => {
    setScheduleActivities((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (isAdmin) {
      try {
        await setDoc(doc(db, 'scheduleActivities', id), updates, { merge: true });
      } catch (e) {
        console.error('Failed to update schedule activity in Firestore:', e);
      }
    }
  };

  // Toggle General Task Completion with real-time assignment update
  const toggleTaskCompletion = async (taskId: string) => {
    const currentStatus = !!taskProgress[taskId];
    const newStatus = !currentStatus;
    const nowIso = new Date().toISOString();

    // Optimistic local update
    setTaskProgress((prev) => {
      const updated = { ...prev, [taskId]: newStatus };
      if (user?.uid) {
        localStorage.setItem(`${LOCAL_STORAGE_PROGRESS_KEY_PREFIX}${user.uid}`, JSON.stringify(updated));
      }
      return updated;
    });

    if (user?.uid) {
      // 1. Persist to real-time dynamic database
      try {
        await fetch('/api/db/assignments/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            studentUid: user.uid,
            studentName: user.displayName || user.studentId,
          }),
        });
      } catch (e) {}

      // 2. Firestore sync
      const assignmentId = `${taskId}_${user.uid}`;
      const assignmentRef = doc(db, 'taskAssignments', assignmentId);

      const assignmentData: TaskAssignment = {
        id: assignmentId,
        taskId,
        studentUid: user.uid,
        studentName: user.displayName || user.studentId,
        status: newStatus ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: newStatus ? nowIso : undefined,
        updatedAt: nowIso,
      };

      try {
        await setDoc(assignmentRef, assignmentData, { merge: true });

        // If completed, create a notification for the student
        if (newStatus) {
          const notifId = `notif_${Date.now()}`;
          const targetTask = tasks.find((t) => t.id === taskId);
          await setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            recipientUid: user.uid,
            title: 'Task Completed',
            message: `You marked "${targetTask?.title || 'Academic Task'}" as completed.`,
            type: 'TASK_COMPLETED',
            entityType: 'task',
            entityId: taskId,
            read: false,
            createdAt: nowIso,
          });
        }
      } catch (e) {
        console.warn('Could not sync assignment to Firestore:', e);
      }
    }
  };

  // Admin action: Create Task
  const createTask = async (
    taskData: Omit<ClassTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string> => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const newTask: ClassTask = {
      ...taskData,
      id,
      section: taskData.section || (taskData.subject as any) || 'VARC',
      subject: taskData.subject || (taskData.section as any) || 'VARC',
      createdBy: user?.uid || 'admin',
      createdByName: user?.displayName || 'Administrator',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setTasks((prev) => [newTask, ...prev]);
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify([newTask, ...tasks]));

    // 1. Dynamic Database persistence
    try {
      await fetch('/api/db/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
    } catch (e) {}

    // 2. Firestore persistence
    try {
      await setDoc(doc(db, 'tasks', id), newTask);

      // Create assigned notifications if published
      if (newTask.status === 'published') {
        const notifId = `notif_assigned_${Date.now()}`;
        const recipients = newTask.assignedStudentUids && newTask.assignedStudentUids.length > 0
          ? newTask.assignedStudentUids
          : ['all'];

        for (const recipientUid of recipients) {
          await setDoc(doc(db, 'notifications', `${notifId}_${recipientUid}`), {
            id: `${notifId}_${recipientUid}`,
            recipientUid: recipientUid === 'all' ? (user?.uid || 'all') : recipientUid,
            title: `New ${newTask.section} Task Assigned`,
            message: `${newTask.title} (${newTask.topic}) — Due ${newTask.deadlineDate}`,
            type: 'TASK_ASSIGNED',
            entityType: 'task',
            entityId: id,
            read: false,
            createdAt: now,
          });
        }
      }
    } catch (e) {
      console.warn('Error writing task to Firestore:', e);
    }

    return id;
  };

  // Admin action: Update Task
  const updateTask = async (taskId: string, updates: Partial<ClassTask>): Promise<void> => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: now } : t))
    );

    // 1. Dynamic DB persistence
    try {
      await fetch(`/api/db/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {}

    // 2. Firestore persistence
    try {
      await setDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: now }, { merge: true });
    } catch (e) {}
  };

  // Admin action: Delete Task
  const deleteTask = async (taskId: string): Promise<void> => {
    setTasks((prev) => {
      const nextTasks = prev.filter((t) => t.id !== taskId);
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(nextTasks));
      localStorage.setItem(SHADOW_VAULT_KEY, JSON.stringify({ tasks: nextTasks, updatedAt: new Date().toISOString() }));
      return nextTasks;
    });
    try {
      await fetch(`/api/db/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend task delete sync note:', e);
    }
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (e) {}
  };

  // Admin action: Delete All Tasks (Bulk Clear)
  const deleteAllTasks = async (): Promise<void> => {
    setTasks([]);
    setTaskAssignments({});
    setTaskProgress({});
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify([]));
    localStorage.setItem(SHADOW_VAULT_KEY, JSON.stringify({ tasks: [], updatedAt: new Date().toISOString() }));
    try {
      await fetch('/api/db/tasks/all/bulk', { method: 'DELETE' });
    } catch (e) {}
  };

  // Admin action: Duplicate Task
  const duplicateTask = async (task: ClassTask): Promise<string> => {
    return await createTask({
      section: task.section,
      subject: task.subject,
      topic: task.topic,
      subtopic: task.subtopic,
      title: `${task.title} (Copy)`,
      shortDescription: task.shortDescription,
      instructions: task.instructions,
      givenInLecture: task.givenInLecture,
      assignedDate: getTodayDateString(),
      deadlineDate: task.deadlineDate,
      deadlineTime: task.deadlineTime,
      submissionMethod: task.submissionMethod,
      additionalNotes: task.additionalNotes,
      priority: task.priority,
      status: 'draft',
      estimatedMinutes: task.estimatedMinutes,
      assignedScope: task.assignedScope,
      assignedStudentUids: task.assignedStudentUids,
    });
  };

  const publishTask = async (taskId: string): Promise<void> => {
    await updateTask(taskId, { status: 'published' });
  };

  const unpublishTask = async (taskId: string): Promise<void> => {
    await updateTask(taskId, { status: 'draft' });
  };

  // Personal Task Methods
  const createPersonalTask = async (payload: {
    title: string;
    section: CATSection | 'General';
    priority: TaskPriority;
    deadlineDate: string;
    deadlineTime?: string;
    notes?: string;
  }): Promise<string> => {
    const id = `ptask_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const newTask: PersonalTask = {
      id,
      userId: currentUid,
      studentUid: currentUid,
      section: payload.section,
      subject: payload.section,
      title: payload.title.trim(),
      notes: payload.notes?.trim() || '',
      deadlineDate: payload.deadlineDate,
      deadlineTime: payload.deadlineTime || '23:59',
      priority: payload.priority,
      status: 'NOT_STARTED',
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    setPersonalTasks((prev) => [newTask, ...prev]);

    if (user?.uid) {
      // 1. Dynamic DB persistence
      try {
        await fetch('/api/db/personal-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newTask, studentUid: user.uid }),
        });
      } catch (e) {}

      // 2. Firestore persistence
      try {
        await setDoc(doc(db, 'users', user.uid, 'personalTasks', id), newTask);
      } catch (e) {
        console.warn('Firestore setDoc personal task note:', e);
      }
    }

    return id;
  };

  const updatePersonalTask = async (taskId: string, updates: Partial<PersonalTask>): Promise<void> => {
    const now = new Date().toISOString();
    setPersonalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: now } : t))
    );

    if (user?.uid) {
      // 1. Dynamic DB persistence
      try {
        await fetch(`/api/db/personal-tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updates, studentUid: user.uid }),
        });
      } catch (e) {}

      // 2. Firestore persistence
      try {
        await setDoc(doc(db, 'users', user.uid, 'personalTasks', taskId), { ...updates, updatedAt: now }, { merge: true });
      } catch (e) {
        console.warn('Firestore update personal task note:', e);
      }
    }
  };

  const deletePersonalTask = async (taskId: string): Promise<void> => {
    setPersonalTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (user?.uid) {
      // 1. Dynamic DB persistence
      try {
        await fetch(`/api/db/personal-tasks/${taskId}?studentUid=${encodeURIComponent(user.uid)}`, {
          method: 'DELETE',
        });
      } catch (e) {}

      // 2. Firestore persistence
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'personalTasks', taskId));
      } catch (e) {
        console.warn('Firestore delete personal task note:', e);
      }
    }
  };

  const togglePersonalTask = async (taskId: string): Promise<void> => {
    const target = personalTasks.find((t) => t.id === taskId);
    if (!target) return;
    const newStatus = !target.completed;
    const now = new Date().toISOString();

    await updatePersonalTask(taskId, {
      completed: newStatus,
      status: newStatus ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: newStatus ? now : undefined,
    });
  };

  // Dynamic Deadline Calculation
  const getTaskDeadlineState = (task: ClassTask): DeadlineState => {
    const isDone = !!taskProgress[task.id];
    const info = getDeadlineInfo(task.deadlineDate, task.deadlineTime, isDone);
    const dueSoon = getDueSoonInfo(task.deadlineDate, task.deadlineTime, isDone);

    if (isDone) {
      return info.isOverdue ? 'COMPLETED_LATE' : 'ON_TIME';
    }
    if (info.isOverdue) return 'OVERDUE';
    if (dueSoon.isDueWithin24Hours || info.isDueToday) return 'DUE_SOON';
    return 'ON_TIME';
  };

  // Visible tasks for student (published & assigned) vs Admin (all)
  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks;
    return tasks.filter((t) => {
      if (t.status !== 'published') return false;
      if (t.assignedScope === 'specific' && t.assignedStudentUids && t.assignedStudentUids.length > 0) {
        return t.assignedStudentUids.includes(currentUid);
      }
      return true;
    });
  }, [tasks, isAdmin, currentUid]);

  // Computed statistics
  const stats = useMemo(() => {
    const total = visibleTasks.length;
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let dueToday = 0;
    let dueTomorrow = 0;
    let dueSoon24h = 0;
    let urgentPending = 0;

    visibleTasks.forEach((t) => {
      const isDone = !!taskProgress[t.id];
      if (isDone) {
        completed++;
      } else {
        pending++;
        const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, false);
        const dueSoon = getDueSoonInfo(t.deadlineDate, t.deadlineTime, false);
        if (info.isOverdue) overdue++;
        if (info.isDueToday) dueToday++;
        if (info.isDueTomorrow) dueTomorrow++;
        if (dueSoon.isDueWithin24Hours) dueSoon24h++;
        if (t.priority === 'Urgent') urgentPending++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const personalCompleted = personalTasks.filter((p) => p.completed).length;
    const personalPending = personalTasks.length - personalCompleted;

    return {
      total,
      completed,
      pending,
      overdue,
      dueToday,
      dueTomorrow,
      dueSoon24h,
      completionRate,
      urgentPending,
      personalTotal: personalTasks.length,
      personalCompleted,
      personalPending,
    };
  }, [visibleTasks, taskProgress, personalTasks]);

  const getTasksBySection = (section: CATSection) => {
    return visibleTasks.filter((t) => t.section === section || t.subject === section);
  };

  const getTasksBySubject = (subject: Subject) => {
    const norm = subject === 'QUANT' ? 'QUANTS' : subject;
    return visibleTasks.filter((t) => t.section === norm || t.subject === subject);
  };

  const getPendingTasks = () => {
    return visibleTasks.filter((t) => !taskProgress[t.id]);
  };

  const getOverdueTasks = () => {
    return visibleTasks.filter((t) => {
      if (taskProgress[t.id]) return false;
      const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, false);
      return info.isOverdue;
    });
  };

  const getDueTodayTasks = () => {
    return visibleTasks.filter((t) => {
      if (taskProgress[t.id]) return false;
      const info = getDeadlineInfo(t.deadlineDate, t.deadlineTime, false);
      return info.isDueToday;
    });
  };

  const getDueIn24HoursTasks = () => {
    return visibleTasks
      .filter((t) => {
        if (taskProgress[t.id]) return false;
        const dueSoon = getDueSoonInfo(t.deadlineDate, t.deadlineTime, false);
        return dueSoon.isDueWithin24Hours;
      })
      .sort((a, b) => {
        const infoA = getDueSoonInfo(a.deadlineDate, a.deadlineTime, false);
        const infoB = getDueSoonInfo(b.deadlineDate, b.deadlineTime, false);
        return infoA.diffHours - infoB.diffHours || infoA.diffMinutes - infoB.diffMinutes;
      });
  };

  return (
    <TaskContext.Provider
      value={{
        tasks: visibleTasks,
        taskProgress,
        taskAssignments,
        personalTasks,
        scheduleActivities,
        loading,
        updateScheduleActivity,
        toggleTaskCompletion,
        createTask,
        updateTask,
        deleteTask,
        deleteAllTasks,
        duplicateTask,
        publishTask,
        unpublishTask,
        createPersonalTask,
        updatePersonalTask,
        deletePersonalTask,
        togglePersonalTask,
        stats,
        getTasksBySection,
        getTasksBySubject,
        getPendingTasks,
        getOverdueTasks,
        getDueTodayTasks,
        getDueIn24HoursTasks,
        getTaskDeadlineState,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

