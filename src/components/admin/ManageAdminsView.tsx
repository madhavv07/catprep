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
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveView, UserProfile } from '../../types';

interface ManageAdminsViewProps {
  setActiveView: (view: ActiveView) => void;
}

export const ManageAdminsView: React.FC<ManageAdminsViewProps> = () => {
  const { user, students, enrollStudent, deleteStudent } = useAuth();

  // Create student form state
  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [batchId, setBatchId] = useState('B-CAT2701');
  const [mentor, setMentor] = useState('Administrator');
  const [showPassword, setShowPassword] = useState(true);

  // UI status & filters
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyCredentials = (s: UserProfile) => {
    const text = `CAT PREP DESK Enrollment:\nStudent ID: ${s.studentId}\nName: ${s.displayName}\nBatch: ${s.batchId || 'B-CAT2701'}\nTarget: CAT 2027`;
    navigator.clipboard.writeText(text);
    setCopiedId(s.uid);
    setTimeout(() => setCopiedId(null), 2500);
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
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Initial Password
              </label>
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
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              {filteredStudents.map((s) => (
                <div
                  key={s.uid}
                  className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                      {s.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{s.displayName}</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          {s.studentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                        <span>Batch: {s.batchId || 'B-CAT2701'}</span>
                        <span>•</span>
                        <span>Target: CAT 2027</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopyCredentials(s)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
