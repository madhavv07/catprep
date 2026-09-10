import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  ShieldAlert,
  X,
  Zap,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useVocab } from '../../context/VocabContext';
import { CATTest, TestAttemptResult } from '../../types';

interface TestRunnerModalProps {
  test: CATTest;
  onClose: () => void;
  onComplete?: (result: TestAttemptResult) => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ test, onClose, onComplete }) => {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const { getStudyAssist } = useVocab();

  // Test session state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  // Timer state
  const totalSeconds = (test.durationMinutes || 15) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const timerRef = useRef<any>(null);

  // Status & Results
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState<boolean>(false);
  const [result, setResult] = useState<TestAttemptResult | null>(null);

  // Study assist modal state
  const [assistLoading, setAssistLoading] = useState<boolean>(false);
  const [assistQuestionId, setAssistQuestionId] = useState<string | null>(null);
  const [assistText, setAssistText] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    if (result) return; // Stop timer if test is submitted

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [result]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion = test.questions[currentIndex];

  const handleSelectOption = (optIndex: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIndex,
    }));
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const copy = new Set(prev);
      if (copy.has(currentQuestion.id)) {
        copy.delete(currentQuestion.id);
      } else {
        copy.add(currentQuestion.id);
      }
      return copy;
    });
  };

  // Submit test to server
  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    setSubmitConfirmOpen(false);

    const timeSpentSeconds = totalSeconds - secondsRemaining;

    try {
      const response = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test.id,
          studentUid: user?.uid,
          answers,
          timeSpentSeconds,
          questions: test.questions,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Server scoring failed');
      }

      const scoredResult: TestAttemptResult = await response.json();
      scoredResult.testTitle = test.title;
      scoredResult.section = test.section;
      scoredResult.topic = test.topic;

      setResult(scoredResult);

      // Trigger celebration if high accuracy
      if (scoredResult.accuracy >= 75) {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }

      // Save attempt to Firestore
      if (user?.uid) {
        try {
          const attemptId = scoredResult.id || `attempt_${Date.now()}`;
          await setDoc(doc(db, 'users', user.uid, 'testAttempts', attemptId), scoredResult);
          await setDoc(doc(db, 'testAttempts', attemptId), scoredResult);
        } catch (e) {
          console.warn('Firestore test attempt save note:', e);
        }

        // Send real-time notification
        await sendNotification({
          recipientUid: user.uid,
          title: `Diagnostic Test Completed: ${test.title}`,
          message: `You scored ${scoredResult.score}/${scoredResult.totalQuestions} (${scoredResult.accuracy}%) in ${test.section}. Detailed review is ready.`,
          type: 'TEST_RESULT',
          entityType: 'test',
          entityId: test.id,
        });
      }

      if (onComplete) {
        onComplete(scoredResult);
      }
    } catch (err: any) {
      alert('Error submitting test: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitTest();
  };

  const handleStudyAssist = async (
    item: any,
    action: 'explain_simply' | 'mistake_analysis' | 'nuance_contrast'
  ) => {
    setAssistLoading(true);
    setAssistQuestionId(item.questionId);
    setAssistText(null);

    const userAns = item.userChoice !== -1 && item.options?.[item.userChoice] !== undefined
      ? item.options[item.userChoice]
      : 'Unattempted';
    const correctAns = item.options?.[item.correctIndex] || 'Correct answer';

    try {
      const explanation = await getStudyAssist({
        action,
        word: item.topic || test.section,
        question: item.question,
        selectedAnswer: userAns,
        correctAnswer: correctAns,
      });
      setAssistText(explanation);
    } catch (e: any) {
      setAssistText('Explanation unavailable at this moment.');
    } finally {
      setAssistLoading(false);
    }
  };

  // Timer urgency style
  const isUrgentTimer = secondsRemaining < 180;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between overflow-y-auto text-zinc-100 font-sans">
      {/* Top Header Bar */}
      <div className="bg-[#09090b] border-b border-zinc-800 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase tracking-wider">
            {test.section}
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {test.title}
            </h2>
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
              Topic: {test.topic} • {test.questions.length} Questions
            </span>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-4">
          {!result && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                isUrgentTimer
                  ? 'bg-rose-950/80 border-rose-600/60 text-rose-400 animate-pulse'
                  : 'bg-zinc-900 border-zinc-700 text-emerald-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}

          {!result ? (
            <button
              onClick={() => setSubmitConfirmOpen(true)}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Test'}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Close Test Window
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Examination Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* ================================================================= */}
        {/* ACTIVE TEST QUESTION RUNNER */}
        {/* ================================================================= */}
        {!result && currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left 3 Cols: Question Statement & Options */}
            <div className="lg:col-span-3 space-y-6">
              {/* Optional Context Pane (Reading Comprehension Passage or DILR Caselet) */}
              {currentQuestion.context && (
                <div className="p-5 rounded-2xl glass-card space-y-2 max-h-[300px] overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Caselet / Reading Passage Context</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {currentQuestion.context}
                  </p>
                </div>
              )}

              {/* Question Statement Card */}
              <div className="p-6 rounded-2xl glass-card space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center">
                      Q{currentIndex + 1}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                      {currentQuestion.typeLabel || 'Multiple Choice'}
                    </span>
                  </div>

                  <button
                    onClick={handleToggleReview}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                      markedForReview.has(currentQuestion.id)
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'btn-glass text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {markedForReview.has(currentQuestion.id) ? 'Marked for Review' : 'Mark for Review'}
                    </span>
                  </button>
                </div>

                {/* Prompt */}
                <h3 className="text-base sm:text-lg font-medium text-white leading-relaxed tracking-tight whitespace-pre-line">
                  {currentQuestion.question}
                </h3>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-emerald-500/[0.12] border-emerald-500/50 text-emerald-200 shadow-sm'
                            : 'glass-card text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.05]'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 border transition ${
                            isSelected
                              ? 'bg-emerald-400 border-emerald-400 text-black shadow-xs'
                              : 'bg-white/[0.06] border-white/[0.10] text-zinc-400'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-xs sm:text-sm leading-relaxed mt-0.5">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action Toolbar */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={handleClearResponse}
                    disabled={answers[currentQuestion.id] === undefined}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear Answer</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 transition flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {currentIndex < test.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSubmitConfirmOpen(true)}
                        className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Finish & Submit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Question Navigation Palette */}
            <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Question Palette</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {Object.keys(answers).length} of {test.questions.length} Answered
                </p>
              </div>

              {/* Grid of question buttons */}
              <div className="grid grid-cols-5 gap-2">
                {test.questions.map((q, qIdx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isMarked = markedForReview.has(q.id);
                  const isCurrent = currentIndex === qIdx;

                  let btnStyle = 'bg-zinc-900 border-zinc-800 text-zinc-400';
                  if (isAnswered && isMarked) {
                    btnStyle = 'bg-purple-950 border-purple-500 text-purple-300 font-bold';
                  } else if (isAnswered) {
                    btnStyle = 'bg-emerald-950 border-emerald-500/60 text-emerald-400 font-bold';
                  } else if (isMarked) {
                    btnStyle = 'bg-purple-950/60 border-purple-600/40 text-purple-400';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(qIdx)}
                      className={`h-9 rounded-xl border text-xs font-mono transition flex items-center justify-center relative ${btnStyle} ${
                        isCurrent ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
                      }`}
                    >
                      {qIdx + 1}
                      {isMarked && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div className="space-y-2 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500/60" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800" />
                  <span>Unattempted</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-purple-950 border border-purple-500" />
                  <span>Marked for Review</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUBMISSION CONFIRMATION MODAL */}
        {/* ================================================================= */}
        {submitConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0d0d10] border border-zinc-700 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ready to submit your test?</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Your answers will be evaluated on the server with verified answer keys.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total Questions:</span>
                  <span className="font-bold text-white">{test.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Attempted:</span>
                  <span className="font-bold text-emerald-400">{Object.keys(answers).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Unanswered:</span>
                  <span className="font-bold text-rose-400">
                    {test.questions.length - Object.keys(answers).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Marked for Review:</span>
                  <span className="font-bold text-purple-400">{markedForReview.size}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSubmitTest}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Evaluating...' : 'Yes, Submit Test'}</span>
                </button>
                <button
                  onClick={() => setSubmitConfirmOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
                >
                  Resume Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TEST EVALUATION & RESULTS BREAKDOWN SCREEN */}
        {/* ================================================================= */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Score Overview Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#09090b] border border-zinc-800 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase tracking-wider">
                    Official Evaluation Complete
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
                    Score: {result.score} / {result.totalQuestions} ({result.accuracy}%)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Time Taken: {Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s • Section: {result.section}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition self-start sm:self-auto shadow-xs"
                >
                  Return to CAT Test Center
                </button>
              </div>

              {/* Performance Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Correct Answers
                  </span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {result.correctCount}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Incorrect
                  </span>
                  <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                    {result.incorrectCount}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Unattempted
                  </span>
                  <span className="text-2xl font-bold font-mono text-zinc-400 mt-1 block">
                    {result.unattemptedCount}
                  </span>
                </div>

                <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Accuracy
                  </span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {result.accuracy}%
                  </span>
                </div>
              </div>

              {/* Recommendations Box */}
              {result.recommendations && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Performance Recommendations
                  </div>
                  <p>{result.recommendations}</p>
                </div>
              )}
            </div>

            {/* Detailed Question-by-Question Review */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">
                Detailed Question Review & Solutions
              </h3>

              {result.detailedReview?.map((item, idx) => {
                const isCorrect = item.isCorrect;
                const isUnattempted = item.userChoice === -1;

                return (
                  <div
                    key={item.questionId || idx}
                    className={`p-6 rounded-2xl border bg-[#09090b] space-y-4 ${
                      isCorrect
                        ? 'border-emerald-500/40'
                        : isUnattempted
                        ? 'border-zinc-800'
                        : 'border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center ${
                            isCorrect
                              ? 'bg-emerald-500 text-black'
                              : isUnattempted
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Question {idx + 1}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                          isCorrect
                            ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                            : isUnattempted
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+3)
                          </>
                        ) : isUnattempted ? (
                          <>
                            <HelpCircle className="w-3.5 h-3.5" /> Unattempted (0)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Incorrect (-1)
                          </>
                        )}
                      </span>
                    </div>

                    {/* Context if present */}
                    {item.context && (
                      <div className="p-3.5 glass-card rounded-xl text-xs text-zinc-300 leading-relaxed">
                        {item.context}
                      </div>
                    )}

                    {/* Statement */}
                    <p className="text-sm font-semibold text-white tracking-tight leading-relaxed whitespace-pre-line">
                      {item.question}
                    </p>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.options?.map((opt: string, optIdx: number) => {
                        const isOptionCorrect = optIdx === item.correctIndex;
                        const isUserOption = optIdx === item.userChoice;

                        let badgeClass = 'bg-white/[0.03] border-white/[0.08] text-zinc-300';
                        if (isOptionCorrect) {
                          badgeClass = 'bg-emerald-500/[0.12] border-emerald-500/40 text-emerald-300 font-semibold';
                        } else if (isUserOption) {
                          badgeClass = 'bg-rose-500/[0.12] border-rose-500/40 text-rose-300 font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-start gap-2 ${badgeClass}`}
                          >
                            <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="leading-snug">{opt}</span>
                            {isOptionCorrect && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                            )}
                            {isUserOption && !isOptionCorrect && (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Solution Explanation */}
                    {item.explanation && (
                      <div className="p-3.5 glass-card rounded-xl text-xs text-zinc-300 leading-relaxed">
                        <span className="font-bold text-white block mb-0.5">Solution Analysis:</span>
                        {item.explanation}
                      </div>
                    )}

                    {/* AI Assist Action Buttons */}
                    <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">
                        AI Study Assist:
                      </span>
                      <button
                        onClick={() => handleStudyAssist(item, 'explain_simply')}
                        disabled={assistLoading}
                        className="btn-glass px-2.5 py-1 rounded-lg text-xs text-zinc-300 transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        Explain Simply
                      </button>

                      {!isCorrect && (
                        <button
                          onClick={() => handleStudyAssist(item, 'mistake_analysis')}
                          disabled={assistLoading}
                          className="btn-glass px-2.5 py-1 rounded-lg text-xs text-rose-300 border-rose-500/30 transition flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5 text-rose-400" />
                          Analyze My Mistake
                        </button>
                      )}
                    </div>

                    {/* Assist Explanation Display */}
                    {assistQuestionId === item.questionId && (
                      <div className="mt-2 p-3.5 rounded-xl glass-card border border-emerald-500/30 text-zinc-200 text-xs leading-relaxed space-y-1 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Question Analysis
                        </div>
                        {assistLoading ? (
                          <p className="text-zinc-400 italic">Formulating tailored breakdown...</p>
                        ) : (
                          <p className="whitespace-pre-line text-zinc-200">{assistText}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
