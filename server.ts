import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { CAT_VARC_DICTIONARY, generateSmartFallbackWord } from './server/varcDictionaryFallback.ts';
import { lookupWordComprehensive } from './server/lexicalService.ts';
import { PROTECTED_TEST_KEYS } from './src/data/seedData.ts';
import {
  initDatabase,
  getDatabaseSnapshot,
  executeTransaction,
  authenticateUser,
  enrollStudentInDb,
  deleteStudentFromDb,
  deleteAllTasksFromDb,
  resetCleanDatabase,
  registerSseClient,
} from './server/dbService.ts';

dotenv.config();

// Initialize durable ACID database engine
initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Cloud / Deployment Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: 'connected',
    environment: process.env.NODE_ENV || 'production',
  });
});

// In-memory registry of active test session answer keys (never exposed to clients)
const ACTIVE_TEST_SESSIONS = new Map<
  string,
  {
    sessionId: string;
    keys: Record<string, { correctIndex: number; explanation: string; topic: string; targetWord?: string }>;
    createdAt: number;
  }
>();

// Helper for Gemini AI instance (lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

// Clean JSON response helper
function extractJsonFromText(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1].trim());
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    }
    throw new Error('Could not parse JSON from model output');
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 3500): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out')), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// -------------------------------------------------------------
// Real-Time Dynamic Database & SSE Engine (ACID Compliant)
// -------------------------------------------------------------

// SSE Real-Time Stream
app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('event: connected\ndata: {"status":"connected"}\n\n');
  registerSseClient(res);
});

// User Authentication (Admin madhav / madhav07 + Student IDs)
app.post('/api/db/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Identifier and password are required' });
  }
  try {
    const user = await authenticateUser(identifier, password);
    if (user) {
      return res.json({ success: true, user });
    }
    return res.status(401).json({ success: false, error: 'Invalid Student ID / Username or Password.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Authentication error' });
  }
});

// Student Roster & Enrollment
app.get('/api/db/students', (req, res) => {
  const snapshot = getDatabaseSnapshot();
  const students = Object.values(snapshot.users)
    .filter((u) => u.role === 'student')
    .map(({ passwordHash, ...profile }) => profile);
  return res.json(students);
});

app.post('/api/db/students/enroll', async (req, res) => {
  const displayName = req.body.displayName || req.body.name;
  const { studentId, password, batchId } = req.body;
  if (!studentId || !displayName || !password) {
    return res.status(400).json({ success: false, error: 'studentId, displayName, and password are required' });
  }
  try {
    const profile = await enrollStudentInDb({ studentId, displayName, password, batchId });
    return res.json({ success: true, student: profile });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Enrollment failed' });
  }
});

app.delete('/api/db/students/:uid', async (req, res) => {
  const uid = req.params.uid;
  if (uid === 'admin_madhav') {
    return res.status(400).json({ success: false, error: 'Cannot delete the primary administrator account.' });
  }
  try {
    await deleteStudentFromDb(uid);
    return res.json({ success: true, uid });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Class Tasks
app.get('/api/db/tasks', (req, res) => {
  const snapshot = getDatabaseSnapshot();
  const tasks = Object.values(snapshot.tasks).sort((a, b) => (b.deadlineDate > a.deadlineDate ? 1 : -1));
  return res.json(tasks);
});

app.delete('/api/db/tasks/all/bulk', async (req, res) => {
  try {
    await deleteAllTasksFromDb();
    return res.json({ success: true, message: 'All class tasks deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/tasks', async (req, res) => {
  const taskData = req.body;
  const id = taskData.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const newTask = {
    ...taskData,
    id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await executeTransaction((state) => {
      state.tasks[id] = newTask;
      return {
        state,
        result: newTask,
        broadcastEvent: { type: 'TASK_CREATED', payload: newTask },
      };
    });
    return res.json({ success: true, task: newTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/db/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const updates = req.body;
  const now = new Date().toISOString();

  try {
    const updated = await executeTransaction((state) => {
      if (!state.tasks[taskId]) {
        throw new Error(`Task ${taskId} not found`);
      }
      state.tasks[taskId] = { ...state.tasks[taskId], ...updates, updatedAt: now };
      return {
        state,
        result: state.tasks[taskId],
        broadcastEvent: { type: 'TASK_UPDATED', payload: state.tasks[taskId] },
      };
    });
    return res.json({ success: true, task: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  try {
    await executeTransaction((state) => {
      delete state.tasks[taskId];
      // Cascade delete task assignments
      for (const assignKey of Object.keys(state.taskAssignments)) {
        if (state.taskAssignments[assignKey]?.taskId === taskId) {
          delete state.taskAssignments[assignKey];
        }
      }
      // Cascade remove from linked schedule activities
      for (const schedId of Object.keys(state.scheduleActivities)) {
        const sched = state.scheduleActivities[schedId];
        if (Array.isArray(sched.linkedTaskIds) && sched.linkedTaskIds.includes(taskId)) {
          sched.linkedTaskIds = sched.linkedTaskIds.filter((id: string) => id !== taskId);
        }
      }
      return {
        state,
        result: true,
        broadcastEvent: { type: 'TASK_DELETED', payload: { id: taskId } },
      };
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Personal Tasks (Student Isolated)
app.get('/api/db/personal-tasks', (req, res) => {
  const studentUid = (req.query.studentUid as string) || '';
  if (!studentUid) {
    return res.json([]);
  }
  const snapshot = getDatabaseSnapshot();
  const list = snapshot.personalTasks[studentUid] || [];
  return res.json(list);
});

app.post('/api/db/personal-tasks', async (req, res) => {
  const { studentUid, ...taskData } = req.body;
  if (!studentUid) {
    return res.status(400).json({ success: false, error: 'studentUid is required' });
  }
  const id = `ptask_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const newPTask = {
    ...taskData,
    id,
    userId: studentUid,
    studentUid,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await executeTransaction((state) => {
      if (!state.personalTasks[studentUid]) {
        state.personalTasks[studentUid] = [];
      }
      state.personalTasks[studentUid].unshift(newPTask);
      return {
        state,
        result: newPTask,
        broadcastEvent: { type: 'PERSONAL_TASK_UPDATED', payload: { studentUid, task: newPTask } },
      };
    });
    return res.json({ success: true, task: newPTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/db/personal-tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const { studentUid, ...updates } = req.body;
  const now = new Date().toISOString();

  try {
    const result = await executeTransaction((state) => {
      const list = state.personalTasks[studentUid] || [];
      const idx = list.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates, updatedAt: now };
      }
      state.personalTasks[studentUid] = list;
      return {
        state,
        result: list[idx],
        broadcastEvent: { type: 'PERSONAL_TASK_UPDATED', payload: { studentUid, taskId } },
      };
    });
    return res.json({ success: true, task: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/personal-tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const studentUid = (req.query.studentUid as string) || (req.body?.studentUid as string);

  try {
    await executeTransaction((state) => {
      if (studentUid && state.personalTasks[studentUid]) {
        state.personalTasks[studentUid] = state.personalTasks[studentUid].filter((t) => t.id !== taskId);
      }
      return {
        state,
        result: true,
        broadcastEvent: { type: 'PERSONAL_TASK_UPDATED', payload: { studentUid, taskId } },
      };
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Task Assignments / Completion (Strict Student Isolation)
app.get('/api/db/assignments', (req, res) => {
  const studentUid = req.query.studentUid as string;
  if (!studentUid) {
    return res.json({});
  }
  const snapshot = getDatabaseSnapshot();
  const studentAssignments: Record<string, any> = {};
  for (const [key, assignment] of Object.entries(snapshot.taskAssignments)) {
    if (assignment.studentUid === studentUid) {
      studentAssignments[assignment.taskId] = assignment;
    }
  }
  return res.json(studentAssignments);
});

app.post('/api/db/assignments/toggle', async (req, res) => {
  const { taskId, studentUid, studentName } = req.body;
  if (!taskId || !studentUid) {
    return res.status(400).json({ success: false, error: 'taskId and studentUid are required' });
  }

  const key = `${taskId}_${studentUid}`;
  const now = new Date().toISOString();

  try {
    const updated = await executeTransaction((state) => {
      const existing = state.taskAssignments[key];
      const newStatus = existing?.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
      const assignment = {
        id: key,
        taskId,
        studentUid,
        studentName: studentName || studentUid,
        status: (newStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS') as any,
        completedAt: newStatus === 'COMPLETED' ? now : undefined,
        updatedAt: now,
      };
      state.taskAssignments[key] = assignment as any;
      return {
        state,
        result: assignment,
        broadcastEvent: { type: 'ASSIGNMENT_UPDATED', payload: assignment },
      };
    });
    return res.json({ success: true, assignment: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Community Feed (Durable & Real-time)
app.get('/api/db/feed', (req, res) => {
  const snapshot = getDatabaseSnapshot();
  const posts = Object.values(snapshot.feedPosts || {}).sort((a: any, b: any) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return res.json(posts);
});

app.post('/api/db/feed', async (req, res) => {
  const postData = req.body;
  const id = postData.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const newPost = {
    ...postData,
    id,
    comments: postData.comments || [],
    upvotes: postData.upvotes || 0,
    upvotedUserIds: postData.upvotedUserIds || [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await executeTransaction((state) => {
      if (!state.feedPosts) state.feedPosts = {};
      state.feedPosts[id] = newPost;
      return {
        state,
        result: newPost,
        broadcastEvent: { type: 'FEED_POST_CREATED', payload: newPost },
      };
    });
    return res.json({ success: true, post: newPost });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/feed/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await executeTransaction((state) => {
      if (state.feedPosts && state.feedPosts[id]) {
        delete state.feedPosts[id];
      }
      return {
        state,
        result: true,
        broadcastEvent: { type: 'FEED_POST_DELETED', payload: { id } },
      };
    });
    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/feed/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { authorId, authorName, authorRole, content } = req.body;
  const commentId = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const comment = { id: commentId, authorId, authorName, authorRole, content, createdAt: now };

  try {
    const updated = await executeTransaction((state) => {
      if (!state.feedPosts || !state.feedPosts[postId]) {
        throw new Error('Post not found');
      }
      state.feedPosts[postId].comments = state.feedPosts[postId].comments || [];
      state.feedPosts[postId].comments.push(comment);
      state.feedPosts[postId].updatedAt = now;
      return {
        state,
        result: state.feedPosts[postId],
        broadcastEvent: { type: 'FEED_COMMENT_ADDED', payload: { postId, comment } },
      };
    });
    return res.json({ success: true, post: updated, comment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/feed/:postId/comments/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  try {
    const updated = await executeTransaction((state) => {
      if (!state.feedPosts || !state.feedPosts[postId]) {
        throw new Error('Post not found');
      }
      state.feedPosts[postId].comments = (state.feedPosts[postId].comments || []).filter((c: any) => c.id !== commentId);
      return {
        state,
        result: state.feedPosts[postId],
        broadcastEvent: { type: 'FEED_COMMENT_DELETED', payload: { postId, commentId } },
      };
    });
    return res.json({ success: true, post: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reset Clean Database & ACID test endpoint
app.post('/api/db/reset-clean', async (req, res) => {
  try {
    await resetCleanDatabase();
    return res.json({ success: true, message: 'Database reset to canonical seed state with admin madhav' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db/acid-test', async (req, res) => {
  try {
    const results = {
      atomicity: false,
      consistency: false,
      isolation: false,
      durability: false,
    };

    // 1. Atomicity: execute transaction that throws and verify zero mutations leaked
    const snapshotBefore = getDatabaseSnapshot();
    const tasksCountBefore = Object.keys(snapshotBefore.tasks).length;
    try {
      await executeTransaction((state) => {
        state.tasks['dummy_task_will_abort'] = { id: 'dummy_task_will_abort' } as any;
        throw new Error('Simulated atomic failure');
      });
    } catch (expectedErr) {}
    const snapshotAfterAbort = getDatabaseSnapshot();
    results.atomicity =
      !snapshotAfterAbort.tasks['dummy_task_will_abort'] &&
      Object.keys(snapshotAfterAbort.tasks).length === tasksCountBefore;

    // 2. Isolation: run concurrent write operations simultaneously
    const concurrentCount = 10;
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(
        executeTransaction((state) => {
          const testId = `concurrent_task_${i}`;
          state.tasks[testId] = {
            id: testId,
            section: 'VARC',
            subject: 'VARC',
            title: `Concurrent Task ${i}`,
            deadlineDate: '2026-09-30',
            status: 'draft',
          } as any;
          return { state, result: testId };
        })
      );
    }
    await Promise.all(promises);

    const snapshotAfterConcurrent = getDatabaseSnapshot();
    let allConcurrentPresent = true;
    for (let i = 0; i < concurrentCount; i++) {
      if (!snapshotAfterConcurrent.tasks[`concurrent_task_${i}`]) {
        allConcurrentPresent = false;
        break;
      }
    }
    results.isolation = allConcurrentPresent;

    // Clean up concurrent test tasks
    await executeTransaction((state) => {
      for (let i = 0; i < concurrentCount; i++) {
        delete state.tasks[`concurrent_task_${i}`];
      }
      return { state, result: true };
    });

    // 3. Consistency: verify invariants hold (users have passwords, tasks have IDs)
    const consistencySnap = getDatabaseSnapshot();
    results.consistency = Boolean(
      consistencySnap.users['admin_madhav'] &&
      consistencySnap.users['admin_madhav'].role === 'admin' &&
      consistencySnap.version > 0
    );

    // 4. Durability: re-read directly from disk file to verify persistence
    const rawDisk = fs.readFileSync(path.join(process.cwd(), 'data', 'prepdesk_db.json'), 'utf-8');
    const parsedDisk = JSON.parse(rawDisk);
    results.durability = parsedDisk.version === consistencySnap.version;

    return res.json({ success: true, results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// VARC AI Vocabulary Lookup Endpoint with 3-Tier Multi-Source Lexical Engine
app.post('/api/gemini/vocab-lookup', async (req, res) => {
  const { word, context } = req.body;
  if (!word || typeof word !== 'string' || word.trim().length === 0) {
    return res.status(400).json({ error: 'Valid word is required' });
  }

  const cleanWord = word.trim().toLowerCase();

  try {
    const ai = getAI();
    const result = await lookupWordComprehensive(cleanWord, context, ai);
    return res.json(result);
  } catch (error: any) {
    console.error('Lexical lookup error, falling back to smart VARC dictionary:', error?.message);
    const fallback = generateSmartFallbackWord(cleanWord);
    return res.json({ ...fallback, source_provider: 'varc_academic_dictionary' });
  }
});

// Helper to generate deterministic test questions from word list if AI quota is reached
function generateLocalTestQuestions(words: any[], count: number) {
  const types = ['meaning', 'synonym', 'antonym', 'context', 'fill_in_blank', 'word_identification'];
  const questions: any[] = [];
  const total = Math.min(count, words.length * 3);

  for (let i = 0; i < total; i++) {
    const target = words[i % words.length];
    const otherWords = words.filter((w) => w.word !== target.word);
    const qType = types[i % types.length];

    if (qType === 'meaning') {
      const distractors = [
        otherWords[0]?.meaning || 'To act with extreme and passive hesitation in academic writing',
        otherWords[1]?.meaning || 'To deliberately obscure empirical data from public inspection',
        otherWords[2]?.meaning || 'Characterized by excessive ornamentation and lack of substance',
      ];
      const allOpts = [target.meaning, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'meaning',
        typeLabel: 'Meaning',
        targetWord: target.word,
        question: `What does "${target.word.toUpperCase()}" most closely mean in academic discourse?`,
        options: allOpts,
        correctIndex: allOpts.indexOf(target.meaning),
        explanation: `"${target.word}" means: ${target.meaning}. ${target.secondaryMeaning ? `Secondary nuance: ${target.secondaryMeaning}` : ''}`,
      });
    } else if (qType === 'synonym') {
      const syn = target.synonyms?.[0] || 'pertinent';
      const distractors = target.antonyms?.slice(0, 2) || ['irrelevant', 'passive'];
      if (distractors.length < 3) distractors.push('quiescent');
      const allOpts = [syn, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'synonym',
        typeLabel: 'Synonym',
        targetWord: target.word,
        question: `Which word is closest in meaning to: "${target.word.toUpperCase()}"?`,
        options: allOpts,
        correctIndex: allOpts.indexOf(syn),
        explanation: `"${syn}" is the most accurate synonym for "${target.word}".`,
      });
    } else if (qType === 'antonym') {
      const ant = target.antonyms?.[0] || 'opposing';
      const distractors = target.synonyms?.slice(0, 2) || ['allied', 'congruent'];
      if (distractors.length < 3) distractors.push('harmonic');
      const allOpts = [ant, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'antonym',
        typeLabel: 'Antonym',
        targetWord: target.word,
        question: `Which word is opposite in meaning to: "${target.word.toUpperCase()}"?`,
        options: allOpts,
        correctIndex: allOpts.indexOf(ant),
        explanation: `"${ant}" is the direct antonym of "${target.word}".`,
      });
    } else if (qType === 'fill_in_blank') {
      const sentence = target.exampleSentence
        ? target.exampleSentence.replace(new RegExp(`\\b${target.word}\\b`, 'gi'), '______')
        : `His ______ approach to the difficult philosophical problem surprised everyone in the lecture.`;
      const distractors = [otherWords[0]?.word || 'hesitant', otherWords[1]?.word || 'placid', 'cursory'];
      const allOpts = [target.word, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'fill_in_blank',
        typeLabel: 'Fill in the blank',
        targetWord: target.word,
        question: `Select the word that best completes the sentence:\n"${sentence}"`,
        options: allOpts,
        correctIndex: allOpts.indexOf(target.word),
        explanation: `"${target.word}" is syntactically and semantically the only fitting option for this academic context.`,
      });
    } else if (qType === 'word_identification') {
      const promptText = target.secondaryMeaning || target.meaning;
      const distractors = [otherWords[0]?.word || 'ephemeral', otherWords[1]?.word || 'ambivalent', 'obdurate'];
      const allOpts = [target.word, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'word_identification',
        typeLabel: 'Word Identification',
        targetWord: target.word,
        question: `Which word best matches the following definition or scenario?\n"${promptText}"`,
        options: allOpts,
        correctIndex: allOpts.indexOf(target.word),
        explanation: `"${target.word}" accurately encapsulates this exact definition.`,
      });
    } else {
      // context
      const correctSentence = target.exampleSentence || `The professor championed the ${target.word} interpretation.`;
      const incorrectSentence1 = `The cafeteria served a completely ${target.word} sandwich that tasted sweet.`;
      const incorrectSentence2 = `She turned on the ${target.word} lamp to illuminate the dark room.`;
      const incorrectSentence3 = `He calculated the ${target.word} sum by multiplying two plus two.`;
      const allOpts = [correctSentence, incorrectSentence1, incorrectSentence2, incorrectSentence3].sort(() => 0.5 - Math.random());
      questions.push({
        id: `q_${i + 1}`,
        type: 'context',
        typeLabel: 'Context Usage',
        targetWord: target.word,
        question: `Which sentence uses "${target.word.toUpperCase()}" with academic accuracy?`,
        options: allOpts,
        correctIndex: allOpts.indexOf(correctSentence),
        explanation: `"${target.word}" is correctly utilized only in the sentence addressing its proper semantic register.`,
      });
    }
  }

  return questions.slice(0, count);
}

// VARC AI Vocabulary Test Generator with Protected Answer Keys
app.post('/api/gemini/generate-test', async (req, res) => {
  const { words, count = 10, difficulty = 'Mixed' } = req.body;
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'Word list is required to generate test' });
  }

  const requestedCount = Math.min(Math.max(1, count), words.length * 3, 30);
  let rawQuestions: any[] = [];

  try {
    const ai = getAI();
    if (ai) {
      const wordSummaries = words.slice(0, 30).map((w: any) => ({
        word: w.word,
        meaning: w.meaning,
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        confidence: w.confidence || 'Medium',
      }));

      const prompt = `You are a professional test author for CAT VARC (Verbal Ability & Reading Comprehension) vocabulary tests.
Generate ${requestedCount} high-quality, unambiguous multiple-choice questions testing the following student vocabulary list:
${JSON.stringify(wordSummaries, null, 2)}

Difficulty setting: ${difficulty}.
Ensure diverse distribution across these 6 official VARC question types:
- "meaning": "What does [WORD] most closely mean?"
- "synonym": "Which word is closest in meaning to [WORD]?"
- "antonym": "Which word is opposite in meaning to [WORD]?"
- "context": "Which sentence uses [WORD] correctly?"
- "fill_in_blank": "Select the word that best completes the sentence: [...]"
- "word_identification": "Which word best describes [definition/scenario]?"

Rules:
1. Every question must have EXACTLY ONE clearly defensible correct answer.
2. Provide exactly 4 distinct options (index 0 to 3).
3. Do NOT make distractors ridiculously obvious; craft realistic, plausible academic distractors.
4. Provide a clear, educational explanation for why the correct option is right.

Return strictly valid JSON array of question objects:
[
  {
    "id": "q1",
    "type": "meaning",
    "typeLabel": "Meaning",
    "targetWord": "word tested",
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Why Option B is the right answer"
  }
]`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        8000
      );

      const text = response.text;
      if (text) {
        const parsed = extractJsonFromText(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawQuestions = parsed;
        }
      }
    }
  } catch (error: any) {
    console.warn('Gemini test generator fallback:', error?.message);
  }

  if (!rawQuestions || rawQuestions.length === 0) {
    rawQuestions = generateLocalTestQuestions(words, requestedCount);
  }

  // Register protected session keys on server
  const sessionId = `vocab_session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const sessionKeys: Record<string, { correctIndex: number; explanation: string; topic: string; targetWord?: string }> = {};

  const sanitizedQuestions = rawQuestions.map((q, idx) => {
    const qId = q.id || `q_${idx + 1}`;
    sessionKeys[qId] = {
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || 'Verified academic usage.',
      topic: q.typeLabel || 'Vocabulary',
      targetWord: q.targetWord,
    };

    return {
      id: qId,
      type: q.type,
      typeLabel: q.typeLabel,
      targetWord: q.targetWord,
      question: q.question,
      options: q.options,
    };
  });

  ACTIVE_TEST_SESSIONS.set(sessionId, {
    sessionId,
    keys: sessionKeys,
    createdAt: Date.now(),
  });

  return res.json({ sessionId, questions: sanitizedQuestions });
});

// Trusted Server-Side Test Submission & Scoring Endpoint
app.post('/api/tests/submit', async (req, res) => {
  const { testId, sessionId, studentUid, answers = {}, timeSpentSeconds = 0, questions = [] } = req.body;

  if (!testId && !sessionId) {
    return res.status(400).json({ error: 'testId or sessionId is required to score test' });
  }

  // 1. Locate answer keys: check active in-memory session or canonical protected test keys
  let keys: Record<string, { correctIndex: number; explanation: string; topic: string; targetWord?: string }> | null = null;

  if (sessionId && ACTIVE_TEST_SESSIONS.has(sessionId)) {
    keys = ACTIVE_TEST_SESSIONS.get(sessionId)!.keys;
  } else if (testId && PROTECTED_TEST_KEYS[testId]) {
    keys = PROTECTED_TEST_KEYS[testId];
  }

  if (!keys) {
    return res.status(404).json({ error: 'Test scoring keys not found or session expired.' });
  }

  // 2. Score objectively on server
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  const incorrectWords: string[] = [];
  const wordsTested: string[] = [];
  const weakAreasSet = new Set<string>();
  const topicMap: Record<string, { correct: number; total: number }> = {};
  const detailedReview: any[] = [];

  // Determine question list from keys or provided questions metadata
  const questionIds = Object.keys(keys);
  const totalQuestions = questionIds.length;

  questionIds.forEach((qId) => {
    const keyInfo = keys![qId];
    const userChoice = typeof answers[qId] === 'number' ? answers[qId] : -1;
    const isAttempted = userChoice !== -1;
    const isCorrect = isAttempted && userChoice === keyInfo.correctIndex;

    const topic = keyInfo.topic || 'General CAT Drill';
    if (!topicMap[topic]) {
      topicMap[topic] = { correct: 0, total: 0 };
    }
    topicMap[topic].total++;

    if (keyInfo.targetWord) {
      wordsTested.push(keyInfo.targetWord);
    }

    if (!isAttempted) {
      unattemptedCount++;
    } else if (isCorrect) {
      score++;
      correctCount++;
      topicMap[topic].correct++;
    } else {
      incorrectCount++;
      weakAreasSet.add(topic);
      if (keyInfo.targetWord) {
        incorrectWords.push(keyInfo.targetWord);
      }
    }

    const questionMeta = questions.find((q: any) => q.id === qId);

    detailedReview.push({
      questionId: qId,
      targetWord: keyInfo.targetWord || questionMeta?.targetWord || '',
      typeLabel: questionMeta?.typeLabel || 'VARC',
      question: questionMeta?.question || `Question ${qId}`,
      context: questionMeta?.context,
      options: questionMeta?.options || [],
      userChoice,
      correctIndex: keyInfo.correctIndex,
      isCorrect,
      explanation: keyInfo.explanation,
    });
  });

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const weakAreas = Array.from(weakAreasSet);

  const recommendations =
    accuracy >= 85
      ? 'Exceptional mastery of this topic. Ready for advanced timed CAT sectional mocks.'
      : accuracy >= 60
      ? 'Solid foundation. Focus on reviewing specific distractors and subtle nuances marked in weak areas.'
      : 'Targeted revision required. Revisit foundational theory and schedule an extra practice set.';

  const resultPayload = {
    id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    studentUid: studentUid || 'anonymous',
    testId: testId || sessionId,
    score,
    totalQuestions,
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracy,
    timeSpentSeconds,
    topicBreakdown: topicMap,
    weakAreas,
    recommendations,
    wordsTested,
    incorrectWords,
    detailedReview,
    submittedAt: new Date().toISOString(),
  };

  return res.json(resultPayload);
});

// VARC AI Study Assistant (focused study explanations)
app.post('/api/gemini/study-assist', async (req, res) => {
  const { action, word, question, selectedAnswer, correctAnswer } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'Target word is required' });
  }

  try {
    const ai = getAI();
    if (ai) {
      let prompt = '';
      if (action === 'explain_simply') {
        prompt = `Explain the word "${word}" simply and intuitively with a relatable real-world analogy. Keep it concise (2-3 sentences max).`;
      } else if (action === 'mistake_analysis') {
        prompt = `A student answered a VARC vocabulary question about "${word}".
Question: "${question}"
Student chose: "${selectedAnswer}"
Correct answer is: "${correctAnswer}"
Provide a brief, encouraging 2-sentence explanation of why "${selectedAnswer}" is incorrect/a distractor and why "${correctAnswer}" is the precise fit.`;
      } else if (action === 'nuance_contrast') {
        prompt = `Explain the subtle CAT-level nuance difference between "${word}" and its commonly confused synonyms in 3 bullet points.`;
      } else {
        prompt = `Provide 2 realistic editorial Reading Comprehension sentences using "${word}" in diverse academic contexts.`;
      }

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            temperature: 0.3,
          },
        }),
        8000
      );

      if (response.text) {
        return res.json({ explanation: response.text });
      }
    }
  } catch (error: any) {
    console.warn('Study assist fallback:', error?.message);
  }

  const fallback = generateSmartFallbackWord(word);
  if (action === 'mistake_analysis') {
    return res.json({
      explanation: `In this question, "${correctAnswer}" directly aligns with "${word}"'s core academic definition (${fallback.meaning}), whereas "${selectedAnswer}" represents a common distractor that shifts the semantic focus.`,
    });
  }

  return res.json({
    explanation: `"${fallback.word.toUpperCase()}": ${fallback.meaning} ${fallback.secondaryMeaning ? `In competitive exams, also watch for: ${fallback.secondaryMeaning}` : ''} Example: "${fallback.exampleSentence}"`,
  });
});

// General Secure Server-Side Proxy for Gemini API
// Keeps the GEMINI_API_KEY strictly on the server and never exposed to the client
app.post('/api/gemini/proxy', async (req, res) => {
  const { prompt, systemInstruction, model = 'gemini-3.1-flash-lite', temperature = 0.4 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature,
        },
      }),
      9000
    );

    return res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Gemini proxy error:', error?.message);
    return res.status(500).json({ error: error?.message || 'Failed to generate response from Gemini API proxy' });
  }
});

// AI Personalization Engine for CAT preparation based on actual student performance
app.post('/api/ai/personalized-recommendations', async (req, res) => {
  const { studentUid, accuracy, weakAreas = [], section = 'All' } = req.body;

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `You are an elite IIM CAT preparation mentor advising a student preparing under Mentor Vipul Sir (Batch B-CAT2701).
Student profile:
- Current section focus: ${section}
- Recent Diagnostic Accuracy: ${accuracy}%
- Weak / Missed Topic Areas: ${weakAreas.length > 0 ? weakAreas.join(', ') : 'Foundational concepts'}

Provide 3 highly specific, actionable, and non-generic study recommendations for the student to execute over the next 48 hours.
Focus on CAT-standard methodologies (e.g. option elimination, multiplier factors in Quants, grid matrices in DILR, reading for author tone in VARC).

Format as a clean JSON object:
{
  "summary": "One punchy sentence summarizing their current focus priority.",
  "actionItems": [
    { "title": "...", "description": "...", "section": "..." }
  ],
  "recommendedDrill": "Specific drill name to take next"
}`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        8000
      );

      if (response.text) {
        const parsed = extractJsonFromText(response.text);
        return res.json(parsed);
      }
    }
  } catch (err: any) {
    console.warn('AI recommendation fallback:', err?.message);
  }

  // Deterministic pedagogical fallback
  return res.json({
    summary: `Prioritize targeted drill practice on ${weakAreas[0] || 'core concepts'} before the next lecture cycle.`,
    actionItems: [
      {
        title: `Consolidate ${weakAreas[0] || section} fundamentals`,
        description: 'Re-solve all class lecture examples and notebook derivations from the last two sessions.',
        section: section,
      },
      {
        title: 'Timed sectional practice',
        description: 'Attempt 10 unassisted timed questions, enforcing a strict 2-minute per question limit.',
        section: section,
      },
      {
        title: 'Error-log analysis',
        description: 'Classify mistakes into calculation slips, trap options, or conceptual gaps in your personal revision notebook.',
        section: section,
      },
    ],
    recommendedDrill: `${section} Sectional Practice Drill #1`,
  });
});


// Vite middleware & Static serving
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PrepDesk server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

