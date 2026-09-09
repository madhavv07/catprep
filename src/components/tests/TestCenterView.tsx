import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Filter,
  Layers,
  ChevronRight,
  TrendingUp,
  History,
  Zap,
  BarChart3
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { SEED_CAT_TESTS } from '../../data/seedData';
import { CATTest, TestAttemptResult, ActiveView, CATSection } from '../../types';
import { TestRunnerModal } from './TestRunnerModal';

interface TestCenterViewProps {
  setActiveView: (view: ActiveView) => void;
}

export const TestCenterView: React.FC<TestCenterViewProps> = ({ setActiveView }) => {
  const { user } = useAuth();

  // Test state
  const [tests, setTests] = useState<CATTest[]>(SEED_CAT_TESTS);
  const [attempts, setAttempts] = useState<TestAttemptResult[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | CATSection | 'HISTORY'>('ALL');
  const [runningTest, setRunningTest] = useState<CATTest | null>(null);

  // Sync public tests from Firestore
  useEffect(() => {
    try {
      const testsRef = collection(db, 'tests');
      const unsubscribe = onSnapshot(
        testsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: CATTest[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...docSnap.data() } as CATTest);
            });
            setTests(list);
          }
        },
        (err) => console.warn('Tests listener note:', err.message)
      );
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // Sync current student's test attempts from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    try {
      const attemptsRef = collection(db, 'users', user.uid, 'testAttempts');
      const unsubscribe = onSnapshot(
        attemptsRef,
        (snapshot) => {
          const list: TestAttemptResult[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as TestAttemptResult);
          });
          list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          setAttempts(list);
        },
        (err) => console.warn('Attempts listener note:', err.message)
      );
      return () => unsubscribe();
    } catch (e) {}
  }, [user?.uid]);

  // Section badge color helper
  const getSectionBadge = (section: string) => {
    switch (section) {
      case 'VARC':
        return 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400';
      case 'DILR':
        return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300';
      case 'QUANTS':
      case 'QUANT':
        return 'bg-violet-950/70 border-violet-500/40 text-violet-300';
      default:
        return 'bg-zinc-900 border-zinc-700 text-zinc-300';
    }
  };

  // Best attempts map: testId -> Best score & accuracy
  const bestAttemptsMap = attempts.reduce<Record<string, TestAttemptResult>>((acc, att) => {
    if (!acc[att.testId] || att.accuracy > acc[att.testId].accuracy) {
      acc[att.testId] = att;
    }
    return acc;
  }, {});

  // Filtered tests
  const filteredTests = tests.filter((t) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'HISTORY') return false;
    return t.section === activeTab;
  });

  // Overall statistics
  const totalTestsTaken = attempts.length;
  const avgAccuracy = totalTestsTaken > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalTestsTaken)
    : 0;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 text-zinc-100">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase tracking-wider">
              CAT Assessment Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
              Verified Server-Side Scoring
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-400" />
            CAT Test Center & Sectional Mocks
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Official diagnostic assessments for VARC, DILR, and QUANTS with detailed solutions and error analysis.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Tests Attempted</span>
            <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">{totalTestsTaken}</span>
          </div>
          <div className="px-4 py-2 bg-zinc-900/80 rounded-xl border border-zinc-800 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Average Accuracy</span>
            <span className="text-lg font-bold font-mono text-white mt-0.5 block">{avgAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-zinc-800/80">
        {(['ALL', 'VARC', 'DILR', 'QUANTS', 'HISTORY'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
              activeTab === tab
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-xs'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            {tab === 'ALL'
              ? 'All Available Tests'
              : tab === 'HISTORY'
              ? `My Past Attempts (${attempts.length})`
              : `${tab} Sectionals`}
          </button>
        ))}
      </div>

      {/* ============================================================= */}
      {/* 1. AVAILABLE TESTS LIST */}
      {/* ============================================================= */}
      {activeTab !== 'HISTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((testItem) => {
            const bestAttempt = bestAttemptsMap[testItem.id];

            return (
              <div
                key={testItem.id}
                className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-700 shadow-xl flex flex-col justify-between space-y-4 transition group hover:scale-[1.01]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getSectionBadge(
                        testItem.section
                      )}`}
                    >
                      {testItem.section}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {testItem.testType}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition leading-snug">
                      {testItem.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      Topic: {testItem.topic} • {testItem.subtopic}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Questions</span>
                      <span className="text-xs font-bold font-mono text-zinc-200 mt-0.5 block">
                        {testItem.questionsCount || testItem.questions.length}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Duration</span>
                      <span className="text-xs font-bold font-mono text-zinc-200 mt-0.5 block">
                        {testItem.durationMinutes}m
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Max Marks</span>
                      <span className="text-xs font-bold font-mono text-emerald-400 mt-0.5 block">
                        {testItem.totalMarks}
                      </span>
                    </div>
                  </div>

                  {/* Previous Attempt Summary Badge if any */}
                  {bestAttempt && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Best: {bestAttempt.score}/{bestAttempt.totalQuestions}
                      </span>
                      <span className="font-mono font-bold">{bestAttempt.accuracy}% Accuracy</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setRunningTest(testItem)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{bestAttempt ? 'Retake Diagnostic Mock' : 'Start Diagnostic Mock'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. ATTEMPT HISTORY LIST */}
      {/* ============================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white">Your Past Test Attempts</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every test session evaluated on the server is permanently logged here.
              </p>
            </div>
          </div>

          {attempts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-3">
              <History className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs">You haven't attempted any diagnostic tests yet.</p>
              <button
                onClick={() => setActiveTab('ALL')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs"
              >
                Browse Available Tests
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-zinc-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getSectionBadge(
                          att.section
                        )}`}
                      >
                        {att.section}
                      </span>
                      <h4 className="text-sm font-bold text-white">{att.testTitle || att.topic || 'Diagnostic Drill'}</h4>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Submitted on: {new Date(att.submittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-emerald-400 block">
                        Score: {att.score} / {att.totalQuestions}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 block">
                        {att.accuracy}% Accuracy ({Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s)
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const originalTest = tests.find((t) => t.id === att.testId);
                        if (originalTest) {
                          setRunningTest(originalTest);
                        } else {
                          setActiveView('varc-test');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
                    >
                      Retake Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Runner Modal */}
      {runningTest && (
        <TestRunnerModal
          test={runningTest}
          onClose={() => setRunningTest(null)}
          onComplete={(newResult) => {
            setAttempts((prev) => [newResult, ...prev]);
          }}
        />
      )}
    </div>
  );
};
