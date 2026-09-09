import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TaskProvider } from './context/TaskContext';
import { VocabProvider } from './context/VocabContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudyCalendar } from './components/calendar/StudyCalendar';
import { VocabDictionary } from './components/vocab/VocabDictionary';
import { VocabTest } from './components/vocab/VocabTest';
import { SubjectTasksView } from './components/tasks/SubjectTasksView';
import { CreateTaskView } from './components/admin/CreateTaskView';
import { ManageTasksView } from './components/admin/ManageTasksView';
import { ManageAdminsView } from './components/admin/ManageAdminsView';
import { TaskStatisticsView } from './components/admin/TaskStatisticsView';
import { ProfileView } from './components/profile/ProfileView';
import { FeedView } from './components/feed/FeedView';
import { ActiveView, ClassTask } from './types';
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading, signInWithCredentials } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [taskToEdit, setTaskToEdit] = useState<ClassTask | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ensure login state resets cleanly whenever user logs out
  useEffect(() => {
    if (!user) {
      setSubmitting(false);
      setLoginPassword('');
      setLoginError(null);
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    try {
      const result = await signInWithCredentials(loginUsername, loginPassword);
      if (!result.success) {
        setLoginError(result.error || 'Invalid credentials. Please verify your Student ID and Password.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTask = (task: ClassTask) => {
    setTaskToEdit(task);
    setActiveView('admin-create');
  };

  const handleCreateDone = () => {
    setTaskToEdit(null);
  };

  // 1. Sleek loading screen while session is being verified
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-zinc-100 selection:bg-emerald-500 selection:text-black">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-bold font-mono text-2xl shadow-lg shadow-emerald-500/20 animate-pulse">
            P
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Connecting to PrepDesk CAT 2027...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Beautiful, modern, high-aesthetic sign-in experience
  if (!user) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4 sm:p-6 lg:p-12 text-zinc-100 selection:bg-emerald-500 selection:text-black relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[180px] pointer-events-none" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10 py-6">
          {/* Left Column: Brand Hero & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Cohort Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>OFFICIAL STUDY DESK · BATCH B-CAT2701</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                Engineered for{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  CAT 2027 Mastery.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                A synchronized, real-time command center designed for serious aspirants targeting the 99.9th percentile across VARC, DILR, and Quantitative Aptitude.
              </p>
            </div>

            {/* Feature Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm space-y-1.5 hover:border-zinc-700 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-zinc-200">Real-Time Sync</h2>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Instant live push of schedule, syllabus milestones, and lecture exercises.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm space-y-1.5 hover:border-zinc-700 transition">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-zinc-200">ACID Isolated Progress</h2>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Personalized task lists and test attempts kept strictly isolated per student.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm space-y-1.5 hover:border-zinc-700 transition">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Target className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-zinc-200">99.9%ile Curriculum</h2>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  High-yield editorial passages, logical arrangement sets, and quant drills.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-sm space-y-1.5 hover:border-zinc-700 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-zinc-200">Vocab Vault & Lexical Engine</h2>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Targeted CAT vocabulary dictionary, etymology, and contextual word mastery.
                </p>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="flex items-center gap-6 pt-2 text-xs text-zinc-500 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Real-Time Engine Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target: CAT 2027</span>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Glassmorphic Login Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative group">
              {/* Subtle outer glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent rounded-3xl blur-xl opacity-80 group-hover:opacity-100 transition duration-700" />

              <div className="relative bg-zinc-950/90 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 border border-zinc-800 shadow-2xl space-y-6">
                {/* Brand Logo & Title */}
                <div className="text-left space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black flex items-center justify-center font-extrabold font-mono text-xl shadow-lg shadow-emerald-500/25">
                    P
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Sign In to Study Desk
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Enter your Student ID or Administrator credentials to continue
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  {/* Student ID / Username */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                      <span>Student ID / Username</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. CAT2701-01 or madhav"
                        className="w-full pl-10 pr-4 py-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-900 text-white placeholder:text-zinc-600 font-mono transition-all outline-none"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full pl-10 pr-10 py-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-900 text-white placeholder:text-zinc-600 font-mono transition-all outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:opacity-95 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2 font-mono">
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Verifying credentials...
                      </span>
                    ) : (
                      <>
                        <span>Sign In to Study Desk</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Card Footer Security Assurance */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500/70" />
                    <span>Protected Session</span>
                  </div>
                  <span className="font-mono text-zinc-600">v2.4 · ACID Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans antialiased text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <main className="flex-1 min-w-0">
          {activeView === 'dashboard' && <Dashboard setActiveView={setActiveView} />}
          {(activeView === 'calendar' || activeView === 'schedule') && (
            <StudyCalendar setActiveView={setActiveView} />
          )}
          {activeView === 'feed' && <FeedView setActiveView={setActiveView} />}
          {activeView === 'varc-tasks' && <SubjectTasksView subject="VARC" setActiveView={setActiveView} onEditTask={handleEditTask} />}
          {activeView === 'dilr-tasks' && <SubjectTasksView subject="DILR" setActiveView={setActiveView} onEditTask={handleEditTask} />}
          {activeView === 'quant-tasks' && <SubjectTasksView subject="QUANT" setActiveView={setActiveView} onEditTask={handleEditTask} />}
          {activeView === 'my-tasks' && <SubjectTasksView setActiveView={setActiveView} onEditTask={handleEditTask} />}
          {(activeView === 'varc-vocab' || (activeView as any) === 'vocab-dict') && (
            <VocabDictionary setActiveView={setActiveView} />
          )}
          {(activeView === 'varc-test' || (activeView as any) === 'vocab-test') && (
            <VocabTest setActiveView={setActiveView} />
          )}
          {activeView === 'profile' && <ProfileView setActiveView={setActiveView} />}
          {activeView === 'admin-create' && (
            <CreateTaskView
              setActiveView={setActiveView}
              taskToEdit={taskToEdit}
              onDone={handleCreateDone}
            />
          )}
          {activeView === 'admin-manage' && (
            <ManageTasksView setActiveView={setActiveView} onEditTask={handleEditTask} />
          )}
          {(activeView === 'admin-users' || activeView === 'admin-students') && (
            <ManageAdminsView setActiveView={setActiveView} />
          )}
          {activeView === 'admin-stats' && <TaskStatisticsView setActiveView={setActiveView} />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TaskProvider>
          <VocabProvider>
            <MainApp />
          </VocabProvider>
        </TaskProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
