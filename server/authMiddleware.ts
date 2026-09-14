import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedUser {
  uid: string;
  studentId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'student';
  batchId?: string;
  mentor?: string;
}

export interface SessionData {
  token: string;
  user: AuthenticatedUser;
  createdAt: number;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = 'prepdesk_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory active session store
const ACTIVE_SESSIONS = new Map<string, SessionData>();

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function createSession(user: AuthenticatedUser): { token: string; user: AuthenticatedUser; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const sessionData: SessionData = {
    token,
    user: { ...user },
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  ACTIVE_SESSIONS.set(token, sessionData);

  return { token, user: { ...user }, expiresAt: sessionData.expiresAt };
}

export function getSession(token: string): AuthenticatedUser | null {
  if (!token) return null;
  const session = ACTIVE_SESSIONS.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    ACTIVE_SESSIONS.delete(token);
    return null;
  }

  // Sliding window refresh
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session.user;
}

export function destroySession(token: string): boolean {
  if (!token) return false;
  return ACTIVE_SESSIONS.delete(token);
}

export function destroyUserSessions(uid: string): void {
  for (const [token, session] of ACTIVE_SESSIONS.entries()) {
    if (session.user.uid === uid) {
      ACTIVE_SESSIONS.delete(token);
    }
  }
}

// Request extension interface
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  sessionToken?: string;
}

/**
 * Middleware: Parses session from HttpOnly cookie or Authorization Bearer header
 */
export function authenticateSession(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1].trim();
    }
  }

  if (token) {
    const user = getSession(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  }

  next();
}

/**
 * Middleware: Enforces that the client is authenticated
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.',
    });
  }
  next();
}

/**
 * Middleware: Enforces that the authenticated user is an Administrator
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.',
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrative privileges required.',
    });
  }
  next();
}

/**
 * Middleware: Enforces that the authenticated user is a Student
 */
export function requireStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.',
    });
  }
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Student account required.',
    });
  }
  next();
}
