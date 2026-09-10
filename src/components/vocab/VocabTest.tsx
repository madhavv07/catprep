import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  AlertCircle,
  Lightbulb,
  Zap,
  Check,
} from 'lucide-react';
import { useVocab } from '../../context/VocabContext';
import { VocabQuestion, ActiveView } from '../../types';

interface VocabTestProps {
  setActiveView: (view: ActiveView) => void;
}

export const VocabTest: React.FC<VocabTestProps> = ({ setActiveView }) => {
  const {
    words,
    stats,
    currentSessionId,
    generateTestQuestions,
    submitTestAttempt,
    recordTestResult,
    getStudyAssist,
  } = useVocab();

  // Test states: 'config' | 'running' | 'results'
  const [testState, setTestState] = useState<'config' | 'running' | 'results'>('config');

  // Config options
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [wordFilter, setWordFilter] = useState<'All' | 'Shaky' | 'Medium' | 'Confident' | 'Revision'>('All');
  const [difficulty, setDifficulty] = useState<string>('Mixed');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Active test execution
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  // Results state
  const [resultsData, setResultsData] = useState<{
    score: number;
    total: number;
    accuracy: number;
    incorrectWords: string[];
    wordsTested: string[];
  } | null>(null);
  const [gradedReview, setGradedReview] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // AI study assist modal / inline state
  const [assistLoading, setAssistLoading] = useState<boolean>(false);
  const [assistQuestionId, setAssistQuestionId] = useState<string | null>(null);
  const [assistText, setAssistText] = useState<string | null>(null);

  const startTest = async () => {
    if (words.length === 0) {
      setGenerateError('You need at least 1 word in your vocabulary vault to take a test.');
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    try {
      const generated = await generateTestQuestions({
        count: questionCount,
        wordFilter,
        difficulty,
      });

      if (!generated || generated.length === 0) {
        throw new Error('No test questions could be generated. Please try again.');
      }

      setQuestions(generated);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setGradedReview([]);
      setTestState('running');
    } catch (err: any) {
      setGenerateError(err?.message || 'Failed to initialize test.');
    } finally {
      setGenerating(false);
    }
  };

  const selectOption = (optIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIndex,
    }));
  };

  const submitTest = async () => {
    setIsSubmitting(true);
    try {
      const answersMap: Record<string, number> = {};
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] !== undefined) {
          answersMap[q.id] = selectedAnswers[idx];
        }
      });

      const serverScored = await submitTestAttempt({
        sessionId: currentSessionId || undefined,
        answers: answersMap,
        questions,
      });

      setResultsData({
        score: serverScored.score,
        total: serverScored.totalQuestions,
        accuracy: serverScored.accuracy,
        incorrectWords: serverScored.incorrectWords || [],
        wordsTested: serverScored.wordsTested || [],
      });
      setGradedReview(serverScored.detailedReview || []);
      setTestState('results');

      if (serverScored.accuracy >= 80) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }

      await recordTestResult({
        score: serverScored.score,
        totalQuestions: serverScored.totalQuestions,
        accuracy: serverScored.accuracy,
        wordsTested: serverScored.wordsTested || [],
        incorrectWords: serverScored.incorrectWords || [],
        difficulty,
        recommendations: serverScored.recommendations || 'Focused review logged.',
      });
    } catch (err: any) {
      alert('Error submitting test: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudyAssist = async (
    item: any,
    action: 'explain_simply' | 'mistake_analysis' | 'nuance_contrast'
  ) => {
    setAssistLoading(true);
    const qId = item.questionId || item.id;
    setAssistQuestionId(qId);
    setAssistText(null);

    const userAns = item.userChoice !== undefined && item.userChoice !== -1 && item.options?.[item.userChoice] !== undefined
      ? item.options[item.userChoice]
      : 'No answer selected';
    const correctAns = item.options?.[item.correctIndex] || 'Correct answer';

    try {
      const response = await getStudyAssist({
        action,
        word: item.targetWord || 'Vocabulary',
        question: item.question,
        selectedAnswer: userAns,
        correctAnswer: correctAns,
      });
      setAssistText(response);
    } catch (e: any) {
      setAssistText('Failed to load study assistance.');
    } finally {
      setAssistLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* 1. TEST CONFIGURATION SCREEN */}
      {/* ============================================================ */}
      {testState === 'config' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
          <div className="pb-4 border-b border-white/[0.08]">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              VARC Assessment Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
              Configure Vocabulary Test
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              Personalized CAT-style assessment generated directly from your saved vocabulary vault.
            </p>
          </div>

          {generateError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}

          {/* Setting: Number of questions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Number of Questions
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-w-md">
              {[5, 10, 15, 20].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`py-2 px-4 rounded-xl text-xs font-semibold border transition ${
                    questionCount === cnt
                      ? 'bg-white/[0.15] text-white border-white/[0.25] shadow-xs'
                      : 'btn-glass text-zinc-300'
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Setting: Word Selection Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Word Pool Filter
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'All', label: `All Vault Words (${stats.total})` },
                { key: 'Shaky', label: `Shaky Words Only (${stats.shaky})` },
                { key: 'Revision', label: `Due for Revision (${stats.dueForRevision})` },
                { key: 'Medium', label: `Medium Confidence (${stats.medium})` },
                { key: 'Confident', label: `Confident Mastery (${stats.confident})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setWordFilter(item.key as any)}
                  className={`p-3 rounded-xl text-left border transition ${
                    wordFilter === item.key
                      ? 'bg-white/[0.12] text-white border-emerald-500/40 shadow-xs'
                      : 'glass-card text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs block">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Setting: Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Test Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2.5 max-w-md">
              {['Easy', 'Mixed', 'Hard'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    difficulty === d
                      ? 'bg-white/[0.15] text-white border-white/[0.25] shadow-xs'
                      : 'btn-glass text-zinc-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={() => setActiveView('varc-vocab')}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              &larr; Back to Vocabulary Vault
            </button>

            <button
              onClick={startTest}
              disabled={generating}
              className="btn-primary-glass px-6 py-3 font-semibold text-xs rounded-xl transition flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Test Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Begin Test Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ACTIVE TEST RUNNER */}
      {/* ============================================================ */}
      {testState === 'running' && questions.length > 0 && (
        <div className="space-y-6">
          {/* Top Progress Bar */}
          <div className="glass-card p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400 tabular-nums">
              <span className="font-semibold text-zinc-200">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase">
                {questions[currentIndex]?.typeLabel || 'Vocabulary'}
              </span>
              <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% completed</span>
            </div>
            <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Box */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
            <div>
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                Target Word: <span className="text-emerald-400 font-semibold capitalize text-sm">{questions[currentIndex]?.targetWord}</span>
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-relaxed whitespace-pre-line">
                {questions[currentIndex]?.question}
              </h3>
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-2.5">
              {questions[currentIndex]?.options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => selectOption(optIdx)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3.5 group ${
                      isSelected
                        ? 'bg-emerald-500/[0.12] border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30 text-emerald-200'
                        : 'glass-card border-white/[0.08] text-zinc-300 hover:border-white/[0.16] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? 'bg-emerald-400 text-black shadow-xs'
                          : 'bg-white/[0.06] border border-white/[0.10] text-zinc-400 group-hover:border-white/[0.18]'
                      }`}
                    >
                      {letter}
                    </div>
                    <span
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isSelected ? 'text-emerald-200 font-medium' : 'text-zinc-200'
                      }`}
                    >
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation & Submit Toolbar */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-glass px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="btn-glass px-5 py-2.5 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={submitTest}
                    disabled={isSubmitting}
                    className="btn-primary-glass px-6 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Evaluating on Server...' : 'Submit & Score Test'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. TEST RESULTS & AI REVIEW SCREEN */}
      {/* ============================================================ */}
      {testState === 'results' && resultsData && (
        <div className="space-y-6">
          {/* Score Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Test Evaluation Complete
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2 tabular-nums">
                  Score: {resultsData.score} / {resultsData.total} ({resultsData.accuracy}%)
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Results recorded in your study profile. Word retention scores have been dynamically updated.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestState('config')}
                  className="btn-primary-glass px-4 py-2.5 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Take Another Test</span>
                </button>

                <button
                  onClick={() => setActiveView('varc-vocab')}
                  className="btn-glass px-4 py-2.5 text-zinc-300 font-semibold text-xs rounded-xl transition"
                >
                  Return to Vault
                </button>
              </div>
            </div>

            {/* Performance Summary Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Questions Correct
                </span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block tabular-nums">
                  {resultsData.score} Questions
                </span>
              </div>

              <div className="p-4 glass-card rounded-2xl border border-rose-500/20 bg-rose-500/[0.04]">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Questions to Revise
                </span>
                <span className="text-xl font-bold text-rose-400 mt-1 block tabular-nums">
                  {resultsData.incorrectWords.length} Words Flagged
                </span>
              </div>

              <div className="p-4 glass-card rounded-2xl">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Test Difficulty
                </span>
                <span className="text-xl font-bold text-zinc-200 mt-1 block capitalize">
                  {difficulty} Level
                </span>
              </div>
            </div>
          </div>

          {/* Question-by-Question Deep Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Detailed Question Analysis & AI Explanations
            </h3>

            {(gradedReview.length > 0 ? gradedReview : questions).map((item: any, qIdx: number) => {
              const userChoice = item.userChoice !== undefined && item.userChoice !== -1 ? item.userChoice : selectedAnswers[qIdx];
              const isCorrect = item.isCorrect !== undefined ? item.isCorrect : (userChoice === item.correctIndex);
              const targetWord = item.targetWord || questions[qIdx]?.targetWord || '';
              const typeLabel = item.typeLabel || questions[qIdx]?.typeLabel || 'Vocabulary';
              const qId = item.questionId || item.id || `q_${qIdx + 1}`;
              const options: string[] = item.options || questions[qIdx]?.options || [];
              const explanation = item.explanation || questions[qIdx]?.explanation;

              return (
                <div
                  key={qId}
                  className={`p-5 sm:p-6 rounded-2xl glass-card transition space-y-4 ${
                    isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {qIdx + 1}
                      </span>
                      {targetWord && (
                        <span className="text-xs font-bold text-white capitalize tracking-tight">
                          Target: {targetWord}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-zinc-400">
                        {typeLabel}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </>
                      )}
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <p className="text-sm font-semibold text-white tracking-tight whitespace-pre-line leading-relaxed">
                    {item.question}
                  </p>

                  {/* Options Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {options.map((opt, optIdx) => {
                      const isOptionCorrect = optIdx === item.correctIndex;
                      const isUserOption = optIdx === userChoice;

                      let badgeClass = 'bg-white/[0.03] border-white/[0.08] text-zinc-300';
                      if (isOptionCorrect) {
                        badgeClass = 'bg-emerald-500/[0.12] border-emerald-500/40 text-emerald-300 font-medium';
                      } else if (isUserOption) {
                        badgeClass = 'bg-rose-500/[0.12] border-rose-500/40 text-rose-300 font-medium';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border flex items-start gap-2 ${badgeClass}`}
                        >
                          <span className="font-bold shrink-0">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
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

                  {/* Standard Question Explanation */}
                  {explanation && (
                    <div className="p-3.5 glass-card rounded-xl text-xs text-zinc-300 leading-relaxed">
                      <span className="font-bold text-white block mb-1">Detailed Explanation:</span>
                      {explanation}
                    </div>
                  )}

                  {/* AI Study Assistant Buttons for targeted review */}
                  <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">
                      AI Study Assist:
                    </span>
                    <button
                      onClick={() => handleStudyAssist(item, 'explain_simply')}
                      disabled={assistLoading}
                      className="btn-glass px-2.5 py-1 rounded-lg text-xs text-zinc-300 font-medium transition flex items-center gap-1"
                    >
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                      Explain Simply
                    </button>

                    {!isCorrect && (
                      <button
                        onClick={() => handleStudyAssist(item, 'mistake_analysis')}
                        disabled={assistLoading}
                        className="btn-glass px-2.5 py-1 rounded-lg text-xs text-rose-300 border border-rose-500/30 font-medium transition flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-rose-400" />
                        Analyze My Mistake
                      </button>
                    )}

                    <button
                      onClick={() => handleStudyAssist(item, 'nuance_contrast')}
                      disabled={assistLoading}
                      className="btn-glass px-2.5 py-1 rounded-lg text-xs text-emerald-400 border border-emerald-500/30 font-medium transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3 text-emerald-400" />
                      Nuance Contrast
                    </button>
                  </div>

                  {/* Display active study assistance explanation */}
                  {assistQuestionId === qId && (
                    <div className="mt-2 p-3.5 rounded-xl glass-card border border-emerald-500/30 text-zinc-200 text-xs leading-relaxed space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Solution Breakdown
                      </div>
                      {assistLoading ? (
                        <p className="text-zinc-400 italic">Formulating tailored explanation...</p>
                      ) : (
                        <p className="text-zinc-200 whitespace-pre-line leading-relaxed">{assistText}</p>
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
  );
};
