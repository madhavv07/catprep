import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
const DB_BACKUP_FILE = path.join(DB_DIR, 'prepdesk_db.bak.json');

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

// Secure Password Hashing Helpers
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText.trim(), 12);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  if (!hash || !plainText) return false;
  // If legacy plaintext hash exists during migration window, verify and let caller upgrade
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    return plainText.trim() === hash;
  }
  try {
    return bcrypt.compareSync(plainText.trim(), hash);
  } catch (e) {
    return false;
  }
}

function getInitialAdminPassword(): string {
  if (process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.trim()) {
    return process.env.ADMIN_INITIAL_PASSWORD.trim();
  }
  // If not provided in environment, generate a cryptographically strong 16-character password
  const randomPass = 'Admin#' + crypto.randomBytes(6).toString('hex');
  console.warn('[SECURITY WARNING] ADMIN_INITIAL_PASSWORD not configured in environment variables.');
  console.warn(`[SECURITY] Temporary initial admin password generated: ${randomPass}`);
  console.warn('[SECURITY] Please configure ADMIN_INITIAL_PASSWORD in your .env or hosting environment.');
  return randomPass;
}

// Initial clean seed state
export function getInitialSeedState(): DatabaseState {
  const initialAdminPass = getInitialAdminPassword();
  const users: Record<string, UserProfile & { passwordHash: string }> = {
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
      passwordHash: hashPassword(initialAdminPass),
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
    tasks: {},
    personalTasks: {},
    taskAssignments: {},
    scheduleActivities,
    feedPosts: {},
  };
}

// Ensure database directory and file exist with automatic legacy migration
export function initDatabase(): DatabaseState {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw);

      // Ensure primary admin is present
      if (!dbState?.users['admin_madhav']) {
        const initialAdminPass = getInitialAdminPassword();
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
          passwordHash: hashPassword(initialAdminPass),
        };
        commitStateSync(dbState!);
      }

      // Automatic migration hook: Upgrade any legacy plaintext password hashes to bcrypt in place
      let migrated = false;
      for (const u of Object.values(dbState!.users)) {
        if (u.uid === 'admin_madhav' && (u.passwordHash === 'madhav07' || !u.passwordHash)) {
          u.passwordHash = hashPassword(getInitialAdminPassword());
          migrated = true;
        } else if (u.passwordHash && !u.passwordHash.startsWith('$2a$') && !u.passwordHash.startsWith('$2b$')) {
          u.passwordHash = hashPassword(u.passwordHash);
          migrated = true;
        }
      }
      if (migrated) {
        commitStateSync(dbState!);
        console.log('[Security Audit] Upgraded legacy plaintext passwords to high-entropy bcrypt hashes.');
      }

      return dbState!;
    } catch (err) {
      console.warn('Corrupted database file detected, attempting recovery from backup snapshot:', err);
      if (fs.existsSync(DB_BACKUP_FILE)) {
        try {
          const bakRaw = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
          dbState = JSON.parse(bakRaw);
          commitStateSync(dbState!);
          console.log('Database successfully recovered from backup snapshot.');
          return dbState!;
        } catch (e) {}
      }
    }
  }

  // Seed fresh clean database
  const seed = getInitialSeedState();
  commitStateSync(seed);
  dbState = seed;
  return dbState;
}

// Atomic & durable disk persistence
function commitStateSync(state: DatabaseState): void {
  const tempFile = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    state.lastModified = new Date().toISOString();
    state.version = (state.version || 0) + 1;
    const serialized = JSON.stringify(state, null, 2);

    // Write to atomic temp file first
    fs.writeFileSync(tempFile, serialized, 'utf-8');

    // Create backup copy of previous state
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch (e) {}
    }

    // Atomic rename replacement
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
    }
    throw new Error(`Database commit failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Sequential Transaction Queue
export async function executeTransaction<T>(
  mutator: (state: DatabaseState) => {
    state: DatabaseState;
    result: T;
    broadcastEvent?: { type: string; payload: any };
  }
): Promise<T> {
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

      // Deep clone working state for isolation
      const workingState: DatabaseState = JSON.parse(JSON.stringify(dbState!));

      // Execute mutator
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

// Sanitized snapshot export (Never exposes password hashes)
export function getSanitizedDatabaseSnapshot(): any {
  const snapshot = getDatabaseSnapshot();
  const sanitizedUsers: Record<string, any> = {};
  for (const [uid, u] of Object.entries(snapshot.users)) {
    const { passwordHash, ...profile } = u;
    sanitizedUsers[uid] = profile;
  }
  return {
    ...snapshot,
    users: sanitizedUsers,
  };
}

// Helper: Authenticate user with bcrypt verification (No plaintext passwords stored or returned)
export async function authenticateUser(identifier: string, pass: string): Promise<UserProfile | null> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();
  if (!cleanId || !cleanPass) return null;

  const snapshot = getDatabaseSnapshot();
  for (const uid of Object.keys(snapshot.users)) {
    const u = snapshot.users[uid];
    const matchId =
      u.studentId.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      uid.toLowerCase() === cleanId;

    if (matchId && verifyPassword(cleanPass, u.passwordHash)) {
      // If legacy plaintext password hash was verified, upgrade to bcrypt hash immediately
      if (!u.passwordHash.startsWith('$2a$') && !u.passwordHash.startsWith('$2b$')) {
        await executeTransaction((state) => {
          if (state.users[uid]) {
            state.users[uid].passwordHash = hashPassword(cleanPass);
          }
          return { state, result: true };
        });
      }

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

// Helper: Enroll Student (Password hashed with bcrypt, never returned in roster)
export async function enrollStudentInDb(payload: {
  studentId: string;
  displayName: string;
  password: string;
  email?: string;
  batchId?: string;
}): Promise<UserProfile> {
  const cleanId = payload.studentId.trim().toUpperCase();
  const cleanName = payload.displayName.trim();
  const cleanPass = payload.password.trim();
  const batchId = payload.batchId || 'B-CAT2701';
  const cleanEmail = payload.email?.trim().toLowerCase() || `${cleanId.toLowerCase()}@prepdesk.edu`;

  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  return await executeTransaction((state) => {
    // Consistency check: unique student ID
    for (const u of Object.values(state.users)) {
      if (u.studentId.toUpperCase() === cleanId) {
        throw new Error(`Student ID ${cleanId} is already enrolled.`);
      }
    }

    const uid = `student_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const hashedPassword = hashPassword(cleanPass);

    const newStudent = {
      uid,
      studentId: cleanId,
      email: cleanEmail,
      displayName: cleanName,
      role: 'student' as const,
      batchId,
      mentor: 'Administrator',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordHash: hashedPassword,
    };

    state.users[uid] = newStudent;

    const { passwordHash, ...profile } = newStudent;
    return {
      state,
      result: profile,
      broadcastEvent: { type: 'STUDENT_ENROLLED', payload: profile },
    };
  });
}

// Helper: Reset/Update Student Password (Hashed with bcrypt, never exposed)
export async function resetStudentPasswordInDb(
  uid: string,
  newPass: string
): Promise<UserProfile> {
  const cleanPass = newPass.trim();
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  return await executeTransaction((state) => {
    if (!state.users[uid]) {
      throw new Error(`Student account not found.`);
    }

    state.users[uid].passwordHash = hashPassword(cleanPass);
    const { passwordHash, ...profile } = state.users[uid];
    return {
      state,
      result: profile,
      broadcastEvent: { type: 'STUDENT_PASSWORD_RESET', payload: profile },
    };
  });
}

// Helper: Delete Student and cascade remove their assignments
export async function deleteStudentFromDb(uid: string): Promise<boolean> {
  if (uid === 'admin_madhav') {
    throw new Error('Cannot delete primary administrator.');
  }

  return await executeTransaction((state) => {
    if (!state.users[uid]) {
      throw new Error(`Student ${uid} not found.`);
    }

    delete state.users[uid];
    delete state.personalTasks[uid];

    // Cascade clean assignments
    for (const assignKey of Object.keys(state.taskAssignments)) {
      if (assignKey.endsWith(`_${uid}`)) {
        delete state.taskAssignments[assignKey];
      }
    }

    return {
      state,
      result: true,
      broadcastEvent: { type: 'STUDENT_DELETED', payload: { uid } },
    };
  });
}

// Helper: Bulk Delete All Class Tasks
export async function deleteAllTasksFromDb(): Promise<number> {
  return await executeTransaction((state) => {
    const deletedCount = Object.keys(state.tasks).length;
    state.tasks = {};
    state.taskAssignments = {};
    return {
      state,
      result: deletedCount,
      broadcastEvent: { type: 'ALL_TASKS_DELETED', payload: { deletedCount } },
    };
  });
}

// Helper: Reset Clean Database
export async function resetCleanDatabase(): Promise<DatabaseState> {
  return await executeTransaction(() => {
    const cleanSeed = getInitialSeedState();
    return {
      state: cleanSeed,
      result: cleanSeed,
      broadcastEvent: { type: 'DATABASE_RESET', payload: { version: cleanSeed.version } },
    };
  });
}

// Helper: Validate and Restore Snapshot safely with schema checking
export async function restoreDatabaseSnapshot(snapshot: any): Promise<DatabaseState> {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid snapshot: payload must be a JSON object.');
  }

  // Prevent prototype pollution
  if ('__proto__' in snapshot || 'constructor' in snapshot || 'prototype' in snapshot) {
    throw new Error('Invalid snapshot: prohibited object keys detected.');
  }

  return await executeTransaction((state) => {
    // Validate users collection
    if (snapshot.users) {
      if (Array.isArray(snapshot.users)) {
        snapshot.users.forEach((u: any) => {
          if (u && typeof u.uid === 'string' && typeof u.studentId === 'string') {
            const passHash = u.passwordHash
              ? (u.passwordHash.startsWith('$2a$') || u.passwordHash.startsWith('$2b$') ? u.passwordHash : hashPassword(u.passwordHash))
              : (state.users[u.uid]?.passwordHash || hashPassword('CAT27#DefaultPass'));
            state.users[u.uid] = { ...u, passwordHash: passHash };
          }
        });
      } else if (typeof snapshot.users === 'object') {
        for (const [uid, u] of Object.entries(snapshot.users as Record<string, any>)) {
          if (u && typeof u.studentId === 'string') {
            const passHash = u.passwordHash
              ? (u.passwordHash.startsWith('$2a$') || u.passwordHash.startsWith('$2b$') ? u.passwordHash : hashPassword(u.passwordHash))
              : (state.users[uid]?.passwordHash || hashPassword('CAT27#DefaultPass'));
            state.users[uid] = { ...u, passwordHash: passHash };
          }
        }
      }
    }

    // Restore tasks
    if (snapshot.tasks) {
      if (Array.isArray(snapshot.tasks)) {
        snapshot.tasks.forEach((t: any) => {
          if (t && typeof t.id === 'string') state.tasks[t.id] = t;
        });
      } else if (typeof snapshot.tasks === 'object') {
        state.tasks = { ...state.tasks, ...snapshot.tasks };
      }
    }

    // Restore personal tasks
    if (snapshot.personalTasks && typeof snapshot.personalTasks === 'object') {
      state.personalTasks = { ...state.personalTasks, ...snapshot.personalTasks };
    }

    // Restore task assignments
    if (snapshot.taskAssignments) {
      if (Array.isArray(snapshot.taskAssignments)) {
        snapshot.taskAssignments.forEach((a: any) => {
          if (a && typeof a.id === 'string') state.taskAssignments[a.id] = a;
        });
      } else if (typeof snapshot.taskAssignments === 'object') {
        state.taskAssignments = { ...state.taskAssignments, ...snapshot.taskAssignments };
      }
    }

    // Restore feed posts
    if (snapshot.feedPosts) {
      if (Array.isArray(snapshot.feedPosts)) {
        snapshot.feedPosts.forEach((f: any) => {
          if (f && typeof f.id === 'string') state.feedPosts[f.id] = f;
        });
      } else if (typeof snapshot.feedPosts === 'object') {
        state.feedPosts = { ...state.feedPosts, ...snapshot.feedPosts };
      }
    }

    // Restore schedule activities
    if (snapshot.scheduleActivities) {
      if (Array.isArray(snapshot.scheduleActivities)) {
        snapshot.scheduleActivities.forEach((s: any) => {
          if (s && typeof s.id === 'string') state.scheduleActivities[s.id] = s;
        });
      } else if (typeof snapshot.scheduleActivities === 'object') {
        state.scheduleActivities = { ...state.scheduleActivities, ...snapshot.scheduleActivities };
      }
    }

    // Ensure primary admin is always preserved with valid bcrypt hash
    if (!state.users['admin_madhav']) {
      const initialAdminPass = getInitialAdminPassword();
      state.users['admin_madhav'] = {
        uid: 'admin_madhav',
        studentId: 'MADHAV',
        email: 'madhav@prepdesk.edu',
        displayName: 'Madhav (Administrator)',
        role: 'admin',
        batchId: 'B-CAT2701',
        mentor: 'Administrator',
        createdAt: '2026-09-01T00:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        passwordHash: hashPassword(initialAdminPass),
      };
    }

    return {
      state,
      result: state,
      broadcastEvent: {
        type: 'DATABASE_RESTORED',
        payload: {
          taskCount: Object.keys(state.tasks).length,
          userCount: Object.keys(state.users).length,
          feedCount: Object.keys(state.feedPosts || {}).length,
        },
      },
    };
  });
}
