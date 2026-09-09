import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './AuthContext';
import {
  VocabWord,
  ConfidenceLevel,
  VocabQuestion,
  VocabTestResult,
} from '../types';
import { SEED_VOCABULARY } from '../data/seedData';

interface VocabLookupResult {
  word: string;
  meaning: string;
  secondaryMeaning: string;
  partOfSpeech: string;
  pronunciation: string;
  synonyms: string[];
  antonyms: string[];
  root: string;
  exampleSentence: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  contextualUsage: string;
  source_provider?: string;
}

interface VocabContextType {
  words: VocabWord[];
  testHistory: VocabTestResult[];
  loading: boolean;
  lookupWord: (word: string, context?: string) => Promise<VocabLookupResult>;
  saveWord: (wordData: {
    word: string;
    meaning: string;
    secondaryMeaning?: string;
    partOfSpeech?: string;
    pronunciation?: string;
    synonyms?: string[];
    antonyms?: string[];
    root?: string;
    exampleSentence?: string;
    personalSentence?: string;
    source?: string;
    difficulty?: 'Easy' | 'Medium' | 'Advanced';
    confidence?: ConfidenceLevel;
  }) => Promise<VocabWord>;
  updateWord: (wordId: string, updates: Partial<VocabWord>) => Promise<void>;
  deleteWord: (wordId: string) => Promise<void>;
  currentSessionId: string | null;
  generateTestQuestions: (options: {
    count: number;
    wordFilter: 'All' | 'Shaky' | 'Medium' | 'Confident' | 'Revision';
    difficulty: string;
  }) => Promise<VocabQuestion[]>;
  submitTestAttempt: (payload: {
    sessionId?: string;
    testId?: string;
    answers: Record<string, number>;
    timeSpentSeconds?: number;
    questions?: VocabQuestion[];
  }) => Promise<any>;
  recordTestResult: (resultData: {
    score: number;
    totalQuestions: number;
    accuracy: number;
    wordsTested: string[];
    incorrectWords: string[];
    difficulty: string;
    recommendations: string;
  }) => Promise<void>;
  getStudyAssist: (payload: {
    action: 'explain_simply' | 'mistake_analysis' | 'nuance_contrast' | 'editorial_sentences';
    word: string;
    question?: string;
    selectedAnswer?: string;
    correctAnswer?: string;
  }) => Promise<string>;
  
  // Stats
  stats: {
    total: number;
    shaky: number;
    medium: number;
    confident: number;
    dueForRevision: number;
    masteryScore: number; // 0-100%
  };

  revisionDueWords: VocabWord[];
  findSavedWord: (word: string) => VocabWord | undefined;
}

const VocabContext = createContext<VocabContextType | undefined>(undefined);

const LOCAL_STORAGE_VOCAB_PREFIX = 'prepdesk_vocab_';
const LOCAL_STORAGE_TESTS_PREFIX = 'prepdesk_tests_';

export const VocabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.uid || 'guest';

  // Words state - starts completely fresh (no sample data)
  const [words, setWords] = useState<VocabWord[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_VOCAB_PREFIX}${userId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const nonSeed = Array.isArray(parsed) ? parsed.filter((w: any) => !w.id?.startsWith('seed-vocab-')) : [];
        return nonSeed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Test history state
  const [testHistory, setTestHistory] = useState<VocabTestResult[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_TESTS_PREFIX}${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Sync words from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const cacheKey = `${LOCAL_STORAGE_VOCAB_PREFIX}${user.uid}`;

    try {
      const wordsRef = collection(db, 'users', user.uid, 'words');
      const unsubscribe = onSnapshot(
        wordsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: VocabWord[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() } as VocabWord);
            });
            // Filter out any legacy seed words
            const nonSeed = fetched.filter((w) => !w.id?.startsWith('seed-vocab-'));
            // Sort recently added first
            nonSeed.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
            setWords(nonSeed);
            localStorage.setItem(cacheKey, JSON.stringify(nonSeed));
          } else {
            setWords([]);
            localStorage.setItem(cacheKey, JSON.stringify([]));
          }
        },
        (error) => {
          console.warn('Firestore vocab listener note:', error.message);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up vocab listener:', e);
    }
  }, [user?.uid]);

  // Sync test history from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const cacheKey = `${LOCAL_STORAGE_TESTS_PREFIX}${user.uid}`;

    try {
      const testsRef = collection(db, 'users', user.uid, 'vocabularyTests');
      const unsubscribe = onSnapshot(
        testsRef,
        (snapshot) => {
          const fetched: VocabTestResult[] = [];
          snapshot.forEach((docSnap) => {
            fetched.push({ id: docSnap.id, ...docSnap.data() } as VocabTestResult);
          });
          fetched.sort((a, b) => (b.date > a.date ? 1 : -1));
          setTestHistory(fetched);
          localStorage.setItem(cacheKey, JSON.stringify(fetched));
        },
        (error) => {
          console.warn('Firestore tests listener note:', error.message);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Error setting up tests listener:', e);
    }
  }, [user?.uid]);

  // Lookup word via backend server
  const lookupWord = async (word: string, context?: string): Promise<VocabLookupResult> => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/vocab-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to lookup word');
      }

      const data = await res.json();
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Save new word
  const saveWord = async (wordData: {
    word: string;
    meaning: string;
    secondaryMeaning?: string;
    partOfSpeech?: string;
    pronunciation?: string;
    synonyms?: string[];
    antonyms?: string[];
    root?: string;
    exampleSentence?: string;
    personalSentence?: string;
    source?: string;
    difficulty?: 'Easy' | 'Medium' | 'Advanced';
    confidence?: ConfidenceLevel;
  }): Promise<VocabWord> => {
    const cleanWord = wordData.word.trim().toLowerCase();
    const existing = words.find((w) => w.word.toLowerCase() === cleanWord);

    const now = new Date().toISOString();
    const id = existing ? existing.id : `w_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const newWord: VocabWord = {
      id,
      userId,
      word: cleanWord,
      meaning: wordData.meaning,
      secondaryMeaning: wordData.secondaryMeaning || '',
      partOfSpeech: wordData.partOfSpeech || 'adjective',
      pronunciation: wordData.pronunciation || `/${cleanWord}/`,
      synonyms: wordData.synonyms || [],
      antonyms: wordData.antonyms || [],
      root: wordData.root || '',
      exampleSentence: wordData.exampleSentence || '',
      personalSentence: wordData.personalSentence || '',
      source: wordData.source || 'VARC Practice',
      difficulty: wordData.difficulty || 'Medium',
      confidence: wordData.confidence || 'Medium',
      testsCount: existing ? existing.testsCount : 0,
      correctCount: existing ? existing.correctCount : 0,
      incorrectCount: existing ? existing.incorrectCount : 0,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      lastReviewedAt: now,
    };

    setWords((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      const updated = [newWord, ...filtered];
      localStorage.setItem(`${LOCAL_STORAGE_VOCAB_PREFIX}${userId}`, JSON.stringify(updated));
      return updated;
    });

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'words', id), newWord);
      } catch (e) {
        console.warn('Firestore save word note:', e);
      }
    }

    return newWord;
  };

  // Update existing word
  const updateWord = async (wordId: string, updates: Partial<VocabWord>): Promise<void> => {
    const now = new Date().toISOString();
    setWords((prev) => {
      const updated = prev.map((w) => (w.id === wordId ? { ...w, ...updates, updatedAt: now } : w));
      localStorage.setItem(`${LOCAL_STORAGE_VOCAB_PREFIX}${userId}`, JSON.stringify(updated));
      return updated;
    });

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'words', wordId), {
          ...updates,
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Firestore update word note:', e);
      }
    }
  };

  // Delete word
  const deleteWord = async (wordId: string): Promise<void> => {
    setWords((prev) => {
      const updated = prev.filter((w) => w.id !== wordId);
      localStorage.setItem(`${LOCAL_STORAGE_VOCAB_PREFIX}${userId}`, JSON.stringify(updated));
      return updated;
    });

    if (user?.uid) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'words', wordId));
      } catch (e) {
        console.warn('Firestore delete word note:', e);
      }
    }
  };

  // Quick confidence toggle
  const updateConfidence = async (wordId: string, confidence: ConfidenceLevel): Promise<void> => {
    await updateWord(wordId, { confidence });
  };

  // Generate test questions
  const generateTestQuestions = async (options: {
    count: number;
    wordFilter: 'All' | 'Shaky' | 'Medium' | 'Confident' | 'Revision';
    difficulty: string;
  }): Promise<VocabQuestion[]> => {
    setLoading(true);

    let eligibleWords = [...words];
    if (options.wordFilter === 'Shaky') {
      eligibleWords = words.filter((w) => w.confidence === 'Shaky');
    } else if (options.wordFilter === 'Medium') {
      eligibleWords = words.filter((w) => w.confidence === 'Medium');
    } else if (options.wordFilter === 'Confident') {
      eligibleWords = words.filter((w) => w.confidence === 'Confident');
    } else if (options.wordFilter === 'Revision') {
      eligibleWords = revisionDueWords;
    }

    if (eligibleWords.length === 0) {
      eligibleWords = [...words]; // fallback to all words if filter is empty
    }

    try {
      const res = await fetch('/api/gemini/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: eligibleWords,
          count: options.count,
          difficulty: options.difficulty,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await res.json();
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
      return data.questions || [];
    } finally {
      setLoading(false);
    }
  };

  // Submit test to server for trusted grading
  const submitTestAttempt = async (payload: {
    sessionId?: string;
    testId?: string;
    answers: Record<string, number>;
    timeSpentSeconds?: number;
    questions?: VocabQuestion[];
  }) => {
    const sId = payload.sessionId || currentSessionId;
    const res = await fetch('/api/tests/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sId,
        testId: payload.testId,
        studentUid: user?.uid,
        answers: payload.answers,
        timeSpentSeconds: payload.timeSpentSeconds || 0,
        questions: payload.questions,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit and grade test');
    }

    const scoredResult = await res.json();
    return scoredResult;
  };

  // Record test result & update word stats
  const recordTestResult = async (resultData: {
    score: number;
    totalQuestions: number;
    accuracy: number;
    wordsTested: string[];
    incorrectWords: string[];
    difficulty: string;
    recommendations: string;
  }): Promise<void> => {
    const testId = `test_${Date.now()}`;
    const date = new Date().toISOString();

    const record: VocabTestResult = {
      id: testId,
      userId,
      ...resultData,
      date,
    };

    // Save test result
    setTestHistory((prev) => {
      const updated = [record, ...prev];
      localStorage.setItem(`${LOCAL_STORAGE_TESTS_PREFIX}${userId}`, JSON.stringify(updated));
      return updated;
    });

    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'vocabularyTests', testId), record);
      } catch (e) {
        console.warn('Firestore test record note:', e);
      }
    }

    // Update word review metrics
    const incorrectSet = new Set(resultData.incorrectWords.map((w) => w.toLowerCase()));
    const testedSet = new Set(resultData.wordsTested.map((w) => w.toLowerCase()));

    setWords((prev) => {
      const updated = prev.map((w) => {
        const clean = w.word.toLowerCase();
        if (testedSet.has(clean)) {
          const isWrong = incorrectSet.has(clean);
          const testsCount = w.testsCount + 1;
          const correctCount = isWrong ? w.correctCount : w.correctCount + 1;
          const incorrectCount = isWrong ? w.incorrectCount + 1 : w.incorrectCount;
          // Auto-adjust confidence if student made a mistake
          let newConfidence = w.confidence;
          if (isWrong) {
            newConfidence = 'Shaky';
          } else if (correctCount >= 3 && incorrectCount === 0) {
            newConfidence = 'Confident';
          }

          const wordUpdate = {
            ...w,
            testsCount,
            correctCount,
            incorrectCount,
            confidence: newConfidence,
            lastReviewedAt: date,
            updatedAt: date,
          };

          if (user?.uid) {
            updateDoc(doc(db, 'users', user.uid, 'words', w.id), {
              testsCount,
              correctCount,
              incorrectCount,
              confidence: newConfidence,
              lastReviewedAt: date,
              updatedAt: date,
            }).catch(() => {});
          }

          return wordUpdate;
        }
        return w;
      });

      localStorage.setItem(`${LOCAL_STORAGE_VOCAB_PREFIX}${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Study assistant query
  const getStudyAssist = async (payload: {
    action: 'explain_simply' | 'mistake_analysis' | 'nuance_contrast' | 'editorial_sentences';
    word: string;
    question?: string;
    selectedAnswer?: string;
    correctAnswer?: string;
  }): Promise<string> => {
    try {
      const res = await fetch('/api/gemini/study-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.explanation || 'No explanation available.';
    } catch (e: any) {
      return `Study assist is currently offline: ${e.message}`;
    }
  };

  // Words due for revision
  const revisionDueWords = useMemo(() => {
    return words.filter((w) => {
      if (w.confidence === 'Shaky') return true;
      if (w.incorrectCount > w.correctCount) return true;
      if (!w.lastReviewedAt) return true;
      const last = new Date(w.lastReviewedAt).getTime();
      const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
      return diffDays >= 4; // Not reviewed in 4 days
    });
  }, [words]);

  // Statistics
  const stats = useMemo(() => {
    const total = words.length;
    let shaky = 0;
    let medium = 0;
    let confident = 0;

    words.forEach((w) => {
      if (w.confidence === 'Shaky') shaky++;
      else if (w.confidence === 'Confident') confident++;
      else medium++;
    });

    const masteryScore = total > 0 ? Math.round(((confident * 1 + medium * 0.5) / total) * 100) : 0;

    return {
      total,
      shaky,
      medium,
      confident,
      dueForRevision: revisionDueWords.length,
      masteryScore,
    };
  }, [words, revisionDueWords]);

  const findSavedWord = (word: string) => {
    const clean = word.trim().toLowerCase();
    return words.find((w) => w.word.toLowerCase() === clean);
  };

  return (
    <VocabContext.Provider
      value={{
        words,
        testHistory,
        loading,
        lookupWord,
        saveWord,
        updateWord,
        deleteWord,
        updateConfidence,
        currentSessionId,
        generateTestQuestions,
        submitTestAttempt,
        recordTestResult,
        getStudyAssist,
        stats,
        revisionDueWords,
        findSavedWord,
      }}
    >
      {children}
    </VocabContext.Provider>
  );
};

export const useVocab = () => {
  const context = useContext(VocabContext);
  if (!context) {
    throw new Error('useVocab must be used within a VocabProvider');
  }
  return context;
};
