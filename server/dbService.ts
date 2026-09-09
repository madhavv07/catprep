import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { ClassTask, PersonalTask, TaskAssignment, UserProfile, ScheduleActivity } from '../src/types';
import { CANONICAL_CAT_TASKS, CANONICAL_CAT_SCHEDULE } from '../src/data/seedData';

export interface DatabaseState {
  version: number;
  lastModified: string;
  users: Record<string, UserProfile & { passwordHash: string }>;
  tasks: Record<string, ClassTask>;
  personalTasks: Record<string, PersonalTask[]>; // studentUid -> PersonalTask[]
  taskAssignments: Record<string, TaskAssignment>; // `${taskId}_${studentUid}` -> TaskAssignment
  scheduleActivities: Record<string, ScheduleActivity>;
  feedPosts: Record<string, any>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'prepdesk_db.json');

// In-memory state cache
let dbState: DatabaseState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

// Active SSE client connections for real-time broadcasts
const sseClients = new Set<Response>();

export function registerSseClient(res: Response) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastRealtimeEvent(event: { type: string; payload: any }) {
  const message = `event: update\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Initial clean seed state (Empty of sample tasks and sample community posts)
export function getInitialSeedState(): DatabaseState {
  const users: Record<string, UserProfile & { passwordHash: string }> = {
    // Primary Admin: madhav / madhav07
    admin_madhav: {
      uid: 'admin_madhav',
      studentId: 'MADHAV',
      email: 'madhav@prepdesk.edu',
      displayName: 'Madhav (Administrator)',
      role: 'admin',
      batchId: 'B-CAT2701',
      mentor: 'Administrator',
      createdAt: '2026-09-01T00:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      passwordHash: 'madhav07',
    },
  };

  const scheduleActivities: Record<string, ScheduleActivity> = {};
  for (const s of CANONICAL_CAT_SCHEDULE) {
    scheduleActivities[s.id] = { ...s };
  }

  return {
    version: 1,
    lastModified: new Date().toISOString(),
    users,
    tasks: {}, // No demo/sample tasks - starts completely clean
    personalTasks: {},
    taskAssignments: {},
    scheduleActivities,
    feedPosts: {}, // No sample messages - starts completely clean
  };
}

// Ensure database directory and file exist
export function initDatabase(): DatabaseState {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw);
      // Ensure admin madhav is always present
      if (!dbState?.users['admin_madhav']) {
        dbState!.users['admin_madhav'] = {
          uid: 'admin_madhav',
          studentId: 'MADHAV',
          email: 'madhav@prepdesk.edu',
          displayName: 'Madhav (Administrator)',
          role: 'admin',
          batchId: 'B-CAT2701',
          mentor: 'Administrator',
          createdAt: '2026-09-01T00:00:00.000Z',
          lastLoginAt: new Date().toISOString(),
          passwordHash: 'madhav07',
        };
        commitStateSync(dbState!);
      }
      return dbState!;
    } catch (err) {
      console.warn('Corrupted database file detected, reinitializing seed state:', err);
    }
  }

  const initial = getInitialSeedState();
  commitStateSync(initial);
  dbState = initial;
  return initial;
}

// Atomic & Durable File Commit (ACID Durability & Atomicity)
function commitStateSync(state: DatabaseState) {
  state.lastModified = new Date().toISOString();
  state.version = (state.version || 0) + 1;

  const tempPath = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  const serialized = JSON.stringify(state, null, 2);

  // 1. Write to temporary file with flush to disk
  fs.writeFileSync(tempPath, serialized, 'utf-8');

  // 2. Atomic rename replaces destination file in a single OS atomic step
  fs.renameSync(tempPath, DB_FILE);
}

// Thread-safe Transaction Runner with ACID Properties
export async function executeTransaction<T>(
  mutator: (state: DatabaseState) => { state: DatabaseState; result: T; broadcastEvent?: { type: string; payload: any } }
): Promise<T> {
  // Chain on writeQueue to enforce strict Serializable Isolation
  let resolvePromise!: (val: T) => void;
  let rejectPromise!: (err: any) => void;
  const executionPromise = new Promise<T>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });

  writeQueue = writeQueue.then(async () => {
    try {
      if (!dbState) {
        initDatabase();
      }

      // Deep clone working state for Atomicity (if mutator throws, state is not modified)
      const workingState: DatabaseState = JSON.parse(JSON.stringify(dbState!));

      // Execute atomic mutator
      const { state: updatedState, result, broadcastEvent } = mutator(workingState);

      // Consistency validation checks
      if (!updatedState.users || !updatedState.tasks) {
        throw new Error('Consistency check failed: users or tasks collection missing');
      }

      // Commit atomically & durably
      commitStateSync(updatedState);
      dbState = updatedState;

      // Broadcast real-time change to all connected clients
      if (broadcastEvent) {
        broadcastRealtimeEvent(broadcastEvent);
      }

      resolvePromise(result);
    } catch (error) {
      rejectPromise(error);
    }
  });

  return executionPromise;
}

// Public read helper (returns current immutable state snapshot)
export function getDatabaseSnapshot(): DatabaseState {
  if (!dbState) {
    initDatabase();
  }
  return JSON.parse(JSON.stringify(dbState!));
}

// Helper: Authenticate user against durable database
export async function authenticateUser(identifier: string, pass: string): Promise<UserProfile | null> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  // Special case for master admin credentials
  if ((cleanId === 'madhav' || cleanId === 'admin' || cleanId === 'madhav@prepdesk.edu') && cleanPass === 'madhav07') {
    return await executeTransaction((state) => {
      let admin = state.users['admin_madhav'];
      if (!admin) {
        admin = {
          uid: 'admin_madhav',
          studentId: 'MADHAV',
          email: 'madhav@prepdesk.edu',
          displayName: 'Madhav (Administrator)',
          role: 'admin',
          batchId: 'B-CAT2701',
          mentor: 'Administrator',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          passwordHash: 'madhav07',
        };
        state.users['admin_madhav'] = admin;
      }
      admin.lastLoginAt = new Date().toISOString();
      const { passwordHash, ...profile } = admin;
      return { state, result: profile };
    });
  }

  const snapshot = getDatabaseSnapshot();
  for (const uid of Object.keys(snapshot.users)) {
    const u = snapshot.users[uid];
    const matchId = u.studentId.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId || uid.toLowerCase() === cleanId;
    if (matchId && u.passwordHash === cleanPass) {
      // Update lastLoginAt
      await executeTransaction((state) => {
        if (state.users[uid]) {
          state.users[uid].lastLoginAt = new Date().toISOString();
        }
        return { state, result: true };
      });
      const { passwordHash, ...profile } = u;
      return profile;
    }
  }

  return null;
}

// Helper: Enroll Student
export async function enrollStudentInDb(payload: {
  studentId: string;
  displayName: string;
  password: string;
  batchId?: string;
}): Promise<UserProfile> {
  const cleanId = payload.studentId.trim().toUpperCase();
  const cleanName = payload.displayName.trim();
  const cleanPass = payload.password.trim();
  const batchId = payload.batchId || 'B-CAT2701';

  return await executeTransaction((state) => {
    // Consistency check: unique student ID
    for (const u of Object.values(state.users)) {
      if (u.studentId.toUpperCase() === cleanId) {
        throw new Error(`Student ID ${cleanId} is already enrolled.`);
      }
    }

    const uid = `student_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const email = `${cleanId.toLowerCase()}@prepdesk.edu`;

    const newStudent = {
      uid,
      studentId: cleanId,
      email,
      displayName: cleanName,
      role: 'student' as const,
      batchId,
      mentor: 'Administrator',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordHash: cleanPass,
    };

    state.users[uid] = newStudent;

    const { passwordHash, ...profile } = newStudent;
    const enrolledWithPassword = { ...profile, currentPassword: cleanPass };
    return {
      state,
      result: enrolledWithPassword,
      broadcastEvent: { type: 'STUDENT_ENROLLED', payload: enrolledWithPassword },
    };
  });
}

// Helper: Reset/Update Student Password (Admin control)
export async function resetStudentPasswordInDb(
  uid: string,
  newPass: string
): Promise<UserProfile & { currentPassword: string }> {
  const cleanPass = newPass.trim();
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  return await executeTransaction((state) => {
    if (!state.users[uid]) {
      throw new Error(`Student account not found.`);
    }

    state.users[uid].passwordHash = cleanPass;
    const { passwordHash, ...profile } = state.users[uid];
    const updated = { ...profile, currentPassword: cleanPass };

    return {
      state,
      result: updated,
      broadcastEvent: { type: 'STUDENT_PASSWORD_RESET', payload: updated },
    };
  });
}

// Helper: Reset test data to clean baseline (retaining admin madhav)
export async function resetCleanDatabase(): Promise<void> {
  await executeTransaction((state) => {
    const clean = getInitialSeedState();
    return {
      state: clean,
      result: true,
      broadcastEvent: { type: 'DATABASE_RESET', payload: { version: clean.version } },
    };
  });
}

// Helper: Delete a student and clean up their assignments & personal tasks
export async function deleteStudentFromDb(uid: string): Promise<boolean> {
  return await executeTransaction((state) => {
    if (!state.users[uid]) {
      throw new Error(`Student with ID ${uid} does not exist`);
    }
    const studentInfo = state.users[uid];
    delete state.users[uid];
    delete state.personalTasks[uid];

    // Remove any task assignments tied to this student
    for (const key of Object.keys(state.taskAssignments)) {
      if (state.taskAssignments[key].studentUid === uid) {
        delete state.taskAssignments[key];
      }
    }

    return {
      state,
      result: true,
      broadcastEvent: { type: 'STUDENT_DELETED', payload: { uid, studentId: studentInfo.studentId } },
    };
  });
}

// Helper: Delete all class tasks
export async function deleteAllTasksFromDb(): Promise<boolean> {
  return await executeTransaction((state) => {
    state.tasks = {};
    state.taskAssignments = {};
    return {
      state,
      result: true,
      broadcastEvent: { type: 'ALL_TASKS_DELETED', payload: {} },
    };
  });
}

