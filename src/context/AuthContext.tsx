import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, studentIdToAuthEmail } from '../firebase/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  students: UserProfile[];
  signInWithCredentials: (
    identifier: string,
    passwordInput: string
  ) => Promise<{ success: boolean; error?: string }>;
  initiateLogin: (
    identifier: string,
    passwordInput: string
  ) => Promise<{
    success: boolean;
    requiresOtp?: boolean;
    sessionToken?: string;
    maskedEmail?: string;
    emailDelivered?: boolean;
    warning?: string;
    error?: string;
  }>;
  verifyLoginOtp: (
    sessionToken: string,
    otp: string
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordResetOtp: (
    identifier: string
  ) => Promise<{
    success: boolean;
    resetToken?: string;
    maskedEmail?: string;
    emailDelivered?: boolean;
    warning?: string;
    error?: string;
  }>;
  verifyAndResetPassword: (
    resetToken: string,
    otp: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  enrollStudent: (payload: {
    studentId: string;
    displayName: string;
    password?: string;
    email?: string;
    batchId?: string;
    mentor?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (uid: string) => Promise<{ success: boolean; error?: string }>;
  resetStudentPassword: (
    uid: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'prepdesk_auth_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<UserProfile[]>([]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setUser(data);
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(data));
          } else {
            // Determine initial role: if email is admin email, designate admin
            const email = fbUser.email || '';
            const isAdminEmail =
              email.includes('admin') ||
              email === 'madhavgajjar7@gmail.com';
            const role: UserRole = isAdminEmail ? 'admin' : 'student';
            const initialProfile: UserProfile = {
              uid: fbUser.uid,
              studentId: email.split('@')[0].toUpperCase(),
              email,
              displayName: fbUser.displayName || email.split('@')[0],
              role,
              batchId: 'B-CAT2701',
              mentor: 'Administrator',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, initialProfile, { merge: true });
            setUser(initialProfile);
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(initialProfile));
          }
        } catch (err: any) {
          console.warn('Firestore user profile fetch note:', err.message);
        }
      } else {
        // If not logged in via Firebase Auth, check local cached fallback session
        const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time listener for current user's profile updates
  useEffect(() => {
    if (!user?.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const updated = docSnap.data() as UserProfile;
          setUser(updated);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
        }
      },
      (error) => {
        console.warn('Firestore user live sync note:', error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 3. Real-time student directory listener for Admins
  useEffect(() => {
    if (user?.role !== 'admin') {
      setStudents([]);
      return;
    }

    // Dynamic Database fetch with Shadow Vault Auto-Rehydration
    const STUDENTS_VAULT_KEY = 'prepdesk_students_vault';

    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/db/students', { credentials: 'include' });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const rawVault = localStorage.getItem(STUDENTS_VAULT_KEY);
            let cachedStudents: UserProfile[] = [];
            if (rawVault) {
              try {
                const parsed = JSON.parse(rawVault);
                if (Array.isArray(parsed)) cachedStudents = parsed;
              } catch (e) {}
            }

            if (list.length === 0 && cachedStudents.length > 0) {
              console.log(`[AutoRehydration] Server restarted with 0 students. Rehydrating ${cachedStudents.length} students from shadow vault...`);
              await fetch('/api/db/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ users: cachedStudents }),
              });
              setStudents(cachedStudents);
              return;
            }

            setStudents(list);
            if (list.length > 0) {
              localStorage.setItem(STUDENTS_VAULT_KEY, JSON.stringify(list));
            }
          }
        }
      } catch (e) {}
    };

    fetchStudents();

    // SSE event listener for real-time enrollment updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'STUDENT_ENROLLED' && parsed.payload) {
            setStudents((prev) => {
              const updated = [parsed.payload, ...prev.filter((s) => s.studentId !== parsed.payload.studentId)];
              localStorage.setItem(STUDENTS_VAULT_KEY, JSON.stringify(updated));
              return updated;
            });
          } else if (parsed.type === 'STUDENT_PASSWORD_RESET' && parsed.payload) {
            setStudents((prev) => {
              const updated = prev.map((s) => (s.uid === parsed.payload.uid ? { ...s, updatedAt: new Date().toISOString() } : s));
              localStorage.setItem(STUDENTS_VAULT_KEY, JSON.stringify(updated));
              return updated;
            });
          } else if (parsed.type === 'STUDENT_DELETED' && parsed.payload) {
            setStudents((prev) => {
              const updated = prev.filter((s) => s.uid !== parsed.payload.uid);
              localStorage.setItem(STUDENTS_VAULT_KEY, JSON.stringify(updated));
              return updated;
            });
          } else if (parsed.type === 'DATABASE_RESET' || parsed.type === 'DATABASE_RESTORED') {
            fetchStudents();
          }
        } catch (e) {}
      });
    } catch (e) {}

    // Firestore fallback listener
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsubscribe = onSnapshot(
        usersQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetchedStudents: UserProfile[] = [];
            snapshot.forEach((docSnap) => {
              fetchedStudents.push(docSnap.data() as UserProfile);
            });
            setStudents((prev) => (fetchedStudents.length >= prev.length ? fetchedStudents : prev));
          }
        },
        (err) => {}
      );
      return () => {
        unsubscribe();
        if (eventSource) eventSource.close();
      };
    } catch (e) {
      return () => {
        if (eventSource) eventSource.close();
      };
    }
  }, [user?.role]);

  // Sign In (Supports Student ID, Email, or Admin username madhav)
  const signInWithCredentials = async (
    identifier: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string }> => {
    const rawClean = identifier.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!rawClean || !cleanPass) {
      return { success: false, error: 'Please enter both Student ID / Username and password.' };
    }

    // 1. Primary: Authenticate with server session database
    try {
      const dbRes = await fetch('/api/db/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: rawClean, password: cleanPass }),
      });

      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success && dbData.user) {
          setUser(dbData.user);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(dbData.user));
          if (dbData.token) {
            localStorage.setItem('prepdesk_session_token', dbData.token);
          }
          try {
            await setDoc(doc(db, 'users', dbData.user.uid), dbData.user, { merge: true });
          } catch (e) {}
          return { success: true };
        }
      } else if (dbRes.status === 401 || dbRes.status === 429) {
        const errData = await dbRes.json().catch(() => ({ error: 'Invalid credentials.' }));
        return { success: false, error: errData.error || 'Invalid credentials.' };
      }
    } catch (netErr) {
      console.warn('Backend DB auth offline/failed, falling back to Firebase Auth if configured:', netErr);
    }

    // 2. Fallback: Firebase Auth if configured
    const authEmail = rawClean.includes('@') ? rawClean : studentIdToAuthEmail(rawClean);

    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, cleanPass);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);

      let profile: UserProfile;
      if (snap.exists()) {
        profile = snap.data() as UserProfile;
        await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
      } else {
        const isAdmin = authEmail.includes('admin') || authEmail === 'madhavgajjar7@gmail.com';
        profile = {
          uid: cred.user.uid,
          studentId: rawClean.split('@')[0].toUpperCase(),
          email: authEmail,
          displayName: rawClean.split('@')[0],
          role: isAdmin ? 'admin' : 'student',
          batchId: 'B-CAT2701',
          mentor: 'Administrator',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        await setDoc(userRef, profile, { merge: true });
      }

      setUser(profile);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(profile));
      return { success: true };
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth standard login attempt note:', firebaseErr.message);
      return {
        success: false,
        error:
          firebaseErr.code === 'auth/invalid-credential' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/user-not-found'
            ? 'Invalid credentials. Please verify your Student ID and Password.'
            : firebaseErr.message || 'Authentication failed.',
      };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    localStorage.removeItem('prepdesk_session_token');
  };

  // 2-Step Login: Step 1 (Credentials check -> sends OTP for students)
  const initiateLogin = async (
    identifier: string,
    passwordInput: string
  ): Promise<{
    success: boolean;
    requiresOtp?: boolean;
    sessionToken?: string;
    maskedEmail?: string;
    error?: string;
  }> => {
    const rawClean = identifier.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!rawClean || !cleanPass) {
      return { success: false, error: 'Please enter both Student ID / Username and password.' };
    }

    try {
      const res = await fetch('/api/auth/login/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: rawClean, password: cleanPass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (!data.requiresOtp && data.user) {
          // Direct login (Admin)
          setUser(data.user);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('prepdesk_session_token', data.token);
          }
          try {
            await setDoc(doc(db, 'users', data.user.uid), data.user, { merge: true });
          } catch (e) {}
          return { success: true, requiresOtp: false };
        }
        // Student requires 2FA OTP
        return {
          success: true,
          requiresOtp: true,
          sessionToken: data.sessionToken,
          maskedEmail: data.maskedEmail,
          emailDelivered: data.emailDelivered,
          warning: data.warning,
        };
      }
      return { success: false, error: data.error || 'Invalid credentials.' };
    } catch (e: any) {
      return await signInWithCredentials(identifier, passwordInput);
    }
  };

  // 2-Step Login: Step 2 (Verify OTP code)
  const verifyLoginOtp = async (
    sessionToken: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionToken, otp: otp.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('prepdesk_session_token', data.token);
        }
        try {
          await setDoc(doc(db, 'users', data.user.uid), data.user, { merge: true });
        } catch (e) {}
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid verification code.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Verification failed.' };
    }
  };

  // Request Password Reset OTP
  const requestPasswordResetOtp = async (
    identifier: string
  ): Promise<{
    success: boolean;
    resetToken?: string;
    maskedEmail?: string;
    emailDelivered?: boolean;
    warning?: string;
    error?: string;
  }> => {
    try {
      const res = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          resetToken: data.resetToken,
          maskedEmail: data.maskedEmail,
          emailDelivered: data.emailDelivered,
          warning: data.warning,
        };
      }
      return { success: false, error: data.error || 'Failed to request reset OTP.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  // Verify OTP and Reset Password
  const verifyAndResetPassword = async (
    resetToken: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/forgot-password/verify-and-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetToken, otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try {
          await fetch('/api/auth/rate-limit/reset', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to reset password.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  // Enroll new student (Admin only)
  const enrollStudent = async (payload: {
    studentId: string;
    displayName: string;
    password?: string;
    email?: string;
    batchId?: string;
    mentor?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can enroll students.' };
    }

    const cleanId = payload.studentId.trim().toUpperCase();
    const cleanName = payload.displayName.trim();
    const cleanPass = payload.password ? payload.password.trim() : `CAT27#${Math.random().toString(36).slice(2, 7)}`;
    const cleanEmail = payload.email?.trim().toLowerCase();

    if (!cleanId || !cleanName) {
      return { success: false, error: 'Student ID and Name are required.' };
    }

    // 1. Persist to live dynamic database
    try {
      const res = await fetch('/api/db/students/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: cleanId,
          displayName: cleanName,
          password: cleanPass,
          email: cleanEmail,
          batchId: payload.batchId || 'B-CAT2701',
        }),
      });
      const data = await res.json();
      if (data.success && data.student) {
        setStudents((prev) => [data.student, ...prev.filter((s) => s.studentId !== cleanId)]);
        try {
          await setDoc(doc(db, 'users', data.student.uid), data.student, { merge: true });
        } catch (e) {}
        return { success: true };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    } catch (apiErr) {
      console.warn('Backend student enrollment sync note:', apiErr);
    }

    // 2. Fallback Firestore write
    const authEmail = studentIdToAuthEmail(cleanId);
    const newUid = `student_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;

    const newStudentProfile: UserProfile = {
      uid: newUid,
      studentId: cleanId,
      email: authEmail,
      displayName: cleanName,
      role: 'student',
      batchId: payload.batchId || 'B-CAT2701',
      mentor: payload.mentor || 'Administrator',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', newUid), newStudentProfile);
      setStudents((prev) => [newStudentProfile, ...prev.filter((s) => s.uid !== newUid)]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to enroll student in database.' };
    }
  };

  // Delete student (Admin only)
  const deleteStudent = async (uid: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can delete students.' };
    }
    if (uid === 'admin_madhav' || uid === user.uid) {
      return { success: false, error: 'Cannot delete the administrator account.' };
    }

    setStudents((prev) => prev.filter((s) => s.uid !== uid));

    try {
      const res = await fetch(`/api/db/students/${uid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.warn('Backend student deletion sync note:', e);
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {}

    return { success: true };
  };

  // Reset student password (Admin only)
  const resetStudentPassword = async (
    uid: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (user?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only administrators can reset student passwords.' };
    }
    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const res = await fetch(`/api/db/students/${uid}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: cleanPass }),
      });
      const data = await res.json();
      if (data.success && data.student) {
        setStudents((prev) =>
          prev.map((s) => (s.uid === uid ? { ...s, updatedAt: new Date().toISOString() } : s))
        );
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update student password.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resetting student password.' };
    }
  };

  // Update profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.uid) return;
    // Disallow role modifications from client
    const sanitized = { ...updates };
    delete sanitized.role;
    delete sanitized.uid;

    const refreshed = { ...user, ...sanitized };
    setUser(refreshed);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(refreshed));

    try {
      await setDoc(doc(db, 'users', user.uid), sanitized, { merge: true });
    } catch (e) {
      console.warn('Firestore user profile update note:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role: user?.role || 'student',
        loading,
        isAdmin: user?.role === 'admin',
        students,
        signInWithCredentials,
        initiateLogin,
        verifyLoginOtp,
        requestPasswordResetOtp,
        verifyAndResetPassword,
        signOut,
        enrollStudent,
        deleteStudent,
        resetStudentPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

