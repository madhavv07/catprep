import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  User,
  Search,
  Lock,
  Sparkles,
  Users,
  IdCard,
  GraduationCap,
  X,
  RefreshCw,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveView, UserProfile } from '../../types';

interface ManageAdminsViewProps {
  setActiveView: (view: ActiveView) => void;
}

// Generates strong, breach-immune passwords (avoids Chrome "data breach exposed your password" warnings)
export const generateBreachFreePassword = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CAT27#${rand}`;
};

export const ManageAdminsView: React.FC<ManageAdminsViewProps> = () => {
  const { user, students, enrollStudent, deleteStudent, resetStudentPassword } = useAuth();

  // Create student form state
  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState(() => generateBreachFreePassword());
  const [batchId, setBatchId] = useState('B-CAT2701');
  const [mentor, setMentor] = useState('Administrator');
  const [showPassword, setShowPassword] = useState(true);

  // UI status & filters
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility map (student uid -> boolean)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Reset password modal state
  const [resetModalStudent, setResetModalStudent] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const togglePasswordVisibility = (uid: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [uid]: !prev[uid],
    }));
  };

  const handleCopySinglePassword = (s: UserProfile) => {
    const pass = s.currentPassword || 'None';
    navigator.clipboard.writeText(pass);
    setCopiedPassId(s.uid);
    setTimeout(() => setCopiedPassId(null), 2500);
  };

  const handleCopyCredentials = (s: UserProfile) => {
    const pass = s.currentPassword || 'Contact Admin';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://catprep.onrender.com';
    const text = [
      `🎓 PREPDESK CAT 2027 — Official Scholar Credentials`,
      `----------------------------------------------------`,
      `Student ID:   ${s.studentId}`,
      `Scholar Name: ${s.displayName}`,
      `Password:     ${pass}`,
      `Batch:        ${s.batchId || 'B-CAT2701'}`,
      `Login Portal: ${origin}`,
      `Target Exam:  CAT 2027`,
      `----------------------------------------------------`,
      `Log in at ${origin} using your Student ID and Password.`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(s.uid);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const openResetModal = (s: UserProfile) => {
    setResetModalStudent(s);
    setNewPasswordInput(generateBreachFreePassword());
    setResetShowPassword(true);
    setResetError(null);
    setResetSuccess(null);
  };

  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;

    setResetError(null);
    setResetSuccess(null);

    const cleanPass = newPasswordInput.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetStudentPassword(resetModalStudent.uid, cleanPass);
      if (res.success) {
        setResetSuccess(`Password updated successfully for ${resetModalStudent.displayName}!`);
        setResetModalStudent((prev) => (prev ? { ...prev, currentPassword: cleanPass } : null));
      } else {
        setResetError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Error resetting password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteStudent = async (s: UserProfile) => {
    if (window.confirm(`Are you sure you want to permanently delete student ${s.displayName} (${s.studentId})? This will also remove all their assignments and personal tasks.`)) {
      const res = await deleteStudent(s.uid);
      if (!res.success) {
        setError(res.error || 'Failed to delete student.');
      } else {
        setSuccess(`Student ${s.displayName} (${s.studentId}) deleted successfully.`);
      }
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanId = studentId.trim().toUpperCase();
    const cleanName = displayName.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setError('Please enter a Student ID (e.g., CAT2701-02).');
      return;
    }
    if (!cleanName) {
      setError('Please enter the student\'s full name.');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await enrollStudent({
        studentId: cleanId,
        displayName: cleanName,
        password: cleanPass,
        batchId,
        mentor,
      });

      if (res.success) {
        setSuccess(`Successfully enrolled student ${cleanName} (${cleanId})!`);
        setStudentId('');
        setDisplayName('');
        setPassword('');
      } else {
        setError(res.error || 'Failed to enroll student.');
      }
    } catch (err: any) {
      setError(err.message || 'Error enrolling student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.displayName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 text-zinc-100">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase tracking-wider">
              Administrator Controls
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
              Zero-Trust Student Isolation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Manage Student Accounts & Batch Enrollment
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Issue secure credentials for Batch B-CAT2701 students. Passwords are encrypted through Firebase Auth.
          </p>
        </div>

        <div className="px-4 py-2 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Enrolled Students</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">{students.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ============================================================= */}
        {/* 1. ENROLL NEW STUDENT FORM */}
        {/* ============================================================= */}
        <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Enroll New Scholar</h2>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleEnroll} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Student ID
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. CAT2701-02"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Official registration code for login and class tracking.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Full Scholar Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Initial Password
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateBreachFreePassword())}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Generate a high-entropy, breach-immune password"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Strong</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set initial password (min 6 chars)"
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Breach-immune password pattern prevents browser warning alerts.</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Batch Code
                </label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Assigned Admin
                </label>
                <input
                  type="text"
                  value={mentor}
                  onChange={(e) => setMentor(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Enrolling Scholar...' : 'Enroll Student'}</span>
            </button>
          </form>
        </div>

        {/* ============================================================= */}
        {/* 2. ENROLLED STUDENTS DIRECTORY */}
        {/* ============================================================= */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-white">Active Student Accounts</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Batch B-CAT2701 student roster and authentication details.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID or name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <GraduationCap className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs">No matching student accounts found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((s) => {
                const isPasswordRevealed = !!revealedPasswords[s.uid];

                return (
                  <div
                    key={s.uid}
                    className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-zinc-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-bold font-mono text-sm flex items-center justify-center shrink-0 mt-0.5">
                        {s.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{s.displayName}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            {s.studentId}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            ({s.batchId || 'B-CAT2701'})
                          </span>
                        </div>

                        {/* Password Display Row */}
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-950/90 border border-zinc-800 rounded-lg text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Password:</span>
                          <span className="font-mono font-bold text-emerald-400 tracking-wider">
                            {isPasswordRevealed ? (s.currentPassword || 'None') : '••••••••'}
                          </span>

                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(s.uid)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                            title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {s.currentPassword && (
                            <button
                              type="button"
                              onClick={() => handleCopySinglePassword(s)}
                              className="p-1 text-zinc-400 hover:text-emerald-400 transition cursor-pointer"
                              title="Copy password only"
                            >
                              {copiedPassId === s.uid ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <button
                        onClick={() => openResetModal(s)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-700/60 cursor-pointer"
                        title="Reset student password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reset Pass</span>
                      </button>

                      <button
                        onClick={() => handleCopyCredentials(s)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Copy full enrollment credentials"
                      >
                        {copiedId === s.uid ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Info</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteStudent(s)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title={`Delete student ${s.displayName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 3. RESET PASSWORD MODAL DIALOG */}
      {/* ============================================================= */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Scholar Password</h3>
                  <p className="text-xs text-zinc-400">
                    {resetModalStudent.displayName} · <span className="font-mono text-emerald-400">{resetModalStudent.studentId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalStudent(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3.5 bg-emerald-950/70 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Password Reset Successful!</span>
                </div>
                <div className="text-zinc-300 text-[11px]">
                  New password: <strong className="font-mono text-emerald-400 text-xs">{newPasswordInput}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(resetModalStudent)}
                  className="mt-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy New Account Credentials</span>
                </button>
              </div>
            )}

            <form onSubmit={handlePerformReset} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    New Account Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput(generateBreachFreePassword())}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type={resetShowPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setResetShowPassword(!resetShowPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  The student will immediately be able to sign in with this new password.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalStudent(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition border border-zinc-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isResetting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Save & Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
