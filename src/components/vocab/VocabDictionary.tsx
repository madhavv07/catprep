import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  BookmarkPlus,
  BookOpen,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ExternalLink,
  Globe,
  PenTool,
  PlusCircle,
} from 'lucide-react';
import { useVocab } from '../../context/VocabContext';
import { ConfidenceLevel, VocabWord, ActiveView } from '../../types';

interface VocabDictionaryProps {
  setActiveView: (view: ActiveView) => void;
}

export const VocabDictionary: React.FC<VocabDictionaryProps> = ({ setActiveView }) => {
  const {
    words,
    lookupWord,
    saveWord,
    updateWord,
    deleteWord,
    updateConfidence,
    stats,
    revisionDueWords,
    findSavedWord,
    loading,
  } = useVocab();

  // Mode: 'lookup' | 'manual'
  const [entryMode, setEntryMode] = useState<'lookup' | 'manual'>('lookup');

  // Search & lookup state
  const [searchTerm, setSearchTerm] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Dedicated manual word entry state
  const [manualWord, setManualWord] = useState('');
  const [manualMeaning, setManualMeaning] = useState('');
  const [manualSentence, setManualSentence] = useState('');
  const [manualSecondaryMeaning, setManualSecondaryMeaning] = useState('');
  const [manualPartOfSpeech, setManualPartOfSpeech] = useState('adjective');
  const [manualSynonyms, setManualSynonyms] = useState('');
  const [manualAntonyms, setManualAntonyms] = useState('');
  const [manualSource, setManualSource] = useState('');
  const [manualDifficulty, setManualDifficulty] = useState<'Easy' | 'Medium' | 'Advanced'>('Medium');
  const [manualConfidence, setManualConfidence] = useState<ConfidenceLevel>('Medium');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');
  const [manualErrorMsg, setManualErrorMsg] = useState('');

  // Editable fields before saving (AI lookup result)
  const [editMeaning, setEditMeaning] = useState('');
  const [editSecondaryMeaning, setEditSecondaryMeaning] = useState('');
  const [editExampleSentence, setEditExampleSentence] = useState('');
  const [editPersonalSentence, setEditPersonalSentence] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editConfidence, setEditConfidence] = useState<ConfidenceLevel>('Medium');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Library filter & search state
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState<'ALL' | ConfidenceLevel>('ALL');
  const [showOnlyRevisionDue, setShowOnlyRevisionDue] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'alpha' | 'confidence' | 'difficulty'>('recent');

  // Active word details modal & editing existing words
  const [selectedWordModal, setSelectedWordModal] = useState<VocabWord | null>(null);
  const [isEditingModalWord, setIsEditingModalWord] = useState(false);
  const [modalEditMeaning, setModalEditMeaning] = useState('');
  const [modalEditSecondaryMeaning, setModalEditSecondaryMeaning] = useState('');
  const [modalEditExampleSentence, setModalEditExampleSentence] = useState('');
  const [modalEditPersonalSentence, setModalEditPersonalSentence] = useState('');
  const [modalEditPartOfSpeech, setModalEditPartOfSpeech] = useState('');
  const [modalEditSuccess, setModalEditSuccess] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchTerm.trim();
    if (!clean) return;

    setLookupError(null);
    setSaveSuccess(false);

    try {
      const data = await lookupWord(clean, contextInput);
      setLookupResult(data);
      setEditMeaning(data.meaning || '');
      setEditSecondaryMeaning(data.secondaryMeaning || '');
      setEditExampleSentence(data.exampleSentence || '');
      setEditPersonalSentence(contextInput ? `Found in: ${contextInput}` : '');
      setEditSource(contextInput ? contextInput.slice(0, 40) : 'VARC Reading Comprehension');
      setEditConfidence('Medium');

      // Check if already in library
      const existing = findSavedWord(clean);
      if (existing) {
        setEditConfidence(existing.confidence);
        if (existing.personalSentence) setEditPersonalSentence(existing.personalSentence);
      }
    } catch (err: any) {
      setLookupError(err?.message || 'Could not fetch word details. Please try again.');
    }
  };

  const switchToManualWithWord = (wordToUse: string, contextToUse: string = '') => {
    setEntryMode('manual');
    setManualWord(wordToUse);
    if (contextToUse) {
      setManualSource(contextToUse);
    }
    setLookupError(null);
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualErrorMsg('');
    setManualSuccessMsg('');

    const cleanWord = manualWord.trim().toLowerCase();
    if (!cleanWord) {
      setManualErrorMsg('Please enter a word name.');
      return;
    }
    if (!manualMeaning.trim()) {
      setManualErrorMsg('Please enter the primary word meaning or definition.');
      return;
    }
    if (!manualSentence.trim()) {
      setManualErrorMsg('Please provide an example sentence showing how this word is used.');
      return;
    }

    const synList = manualSynonyms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const antList = manualAntonyms
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    await saveWord({
      word: cleanWord,
      meaning: manualMeaning.trim(),
      secondaryMeaning: manualSecondaryMeaning.trim() || undefined,
      partOfSpeech: manualPartOfSpeech,
      pronunciation: `/${cleanWord}/`,
      synonyms: synList,
      antonyms: antList,
      root: '',
      exampleSentence: manualSentence.trim(),
      personalSentence: manualSource.trim() ? `Source: ${manualSource.trim()}` : '',
      source: manualSource.trim() || 'Manual Entry',
      difficulty: manualDifficulty,
      confidence: manualConfidence,
    });

    setManualSuccessMsg(`"${cleanWord}" was saved to your Vocabulary Vault!`);
    setTimeout(() => {
      setManualWord('');
      setManualMeaning('');
      setManualSentence('');
      setManualSecondaryMeaning('');
      setManualSynonyms('');
      setManualAntonyms('');
      setManualSource('');
      setManualSuccessMsg('');
    }, 1500);
  };

  const openWordModal = (word: VocabWord) => {
    setSelectedWordModal(word);
    setIsEditingModalWord(false);
    setModalEditMeaning(word.meaning);
    setModalEditSecondaryMeaning(word.secondaryMeaning || '');
    setModalEditExampleSentence(word.exampleSentence || '');
    setModalEditPersonalSentence(word.personalSentence || '');
    setModalEditPartOfSpeech(word.partOfSpeech || 'adjective');
    setModalEditSuccess(false);
  };

  const handleModalEditSave = async () => {
    if (!selectedWordModal) return;
    if (!modalEditMeaning.trim()) {
      alert('Word meaning cannot be empty.');
      return;
    }

    await updateWord(selectedWordModal.id, {
      meaning: modalEditMeaning.trim(),
      secondaryMeaning: modalEditSecondaryMeaning.trim(),
      exampleSentence: modalEditExampleSentence.trim(),
      personalSentence: modalEditPersonalSentence.trim(),
      partOfSpeech: modalEditPartOfSpeech.trim() || selectedWordModal.partOfSpeech,
    });

    setSelectedWordModal((prev) =>
      prev
        ? {
            ...prev,
            meaning: modalEditMeaning.trim(),
            secondaryMeaning: modalEditSecondaryMeaning.trim(),
            exampleSentence: modalEditExampleSentence.trim(),
            personalSentence: modalEditPersonalSentence.trim(),
            partOfSpeech: modalEditPartOfSpeech.trim() || prev.partOfSpeech,
          }
        : null
    );

    setModalEditSuccess(true);
    setTimeout(() => {
      setModalEditSuccess(false);
      setIsEditingModalWord(false);
    }, 800);
  };

  const handleSaveToVault = async () => {
    if (!lookupResult) return;

    await saveWord({
      word: lookupResult.word,
      meaning: editMeaning || lookupResult.meaning,
      secondaryMeaning: editSecondaryMeaning || lookupResult.secondaryMeaning,
      partOfSpeech: lookupResult.partOfSpeech,
      pronunciation: lookupResult.pronunciation,
      synonyms: lookupResult.synonyms,
      antonyms: lookupResult.antonyms,
      root: lookupResult.root,
      exampleSentence: editExampleSentence || lookupResult.exampleSentence,
      personalSentence: editPersonalSentence,
      source: editSource,
      difficulty: lookupResult.difficulty,
      confidence: editConfidence,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setLookupResult(null);
      setSearchTerm('');
      setContextInput('');
      setSaveSuccess(false);
    }, 1200);
  };

  const handleDeleteWord = async (wordId: string, wordName: string) => {
    if (window.confirm(`Remove "${wordName}" from your vocabulary vault?`)) {
      await deleteWord(wordId);
      if (selectedWordModal?.id === wordId) {
        setSelectedWordModal(null);
      }
    }
  };

  // Filter & sort library words
  const filteredWords = words.filter((w) => {
    if (librarySearch) {
      const q = librarySearch.toLowerCase();
      const match =
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.synonyms.some((s) => s.toLowerCase().includes(q)) ||
        (w.source && w.source.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (showOnlyRevisionDue) {
      return revisionDueWords.some((rw) => rw.id === w.id);
    }
    if (selectedConfidenceFilter !== 'ALL' && w.confidence !== selectedConfidenceFilter) {
      return false;
    }
    return true;
  });

  filteredWords.sort((a, b) => {
    if (sortBy === 'alpha') return a.word.localeCompare(b.word);
    if (sortBy === 'confidence') {
      const order = { Shaky: 0, Medium: 1, Confident: 2 };
      return order[a.confidence] - order[b.confidence];
    }
    if (sortBy === 'difficulty') {
      const order = { Advanced: 0, Medium: 1, Easy: 2 };
      return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getConfidenceBadge = (level: ConfidenceLevel) => {
    switch (level) {
      case 'Shaky':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
      case 'Medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
      case 'Confident':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Header & Quick Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              VARC Personal Learning
            </span>
            <span className="text-xs text-zinc-600">&bull;</span>
            <span className="text-xs text-zinc-400 font-medium">CAT Academic Register</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Vocabulary Vault & AI Dictionary
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Discover nuanced secondary meanings, Latin roots, and editorial RC sentences.
          </p>
        </div>

        <button
          onClick={() => setActiveView('varc-test')}
          className="btn-primary-glass px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Vocabulary Test</span>
        </button>
      </div>

      {/* 2. Vocabulary Addition Card (AI Lookup or Manual Entry) */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-2xl space-y-4">
        {/* Toggle between AI Lookup and Manual Word & Sentence Entry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setEntryMode('lookup')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                entryMode === 'lookup'
                  ? 'bg-white/[0.14] text-white border border-white/[0.18] shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI & Web Word Lookup</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('manual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                entryMode === 'manual'
                  ? 'bg-white/[0.14] text-white border border-white/[0.18] shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Manual Word & Sentence Entry</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0"></span>
            <span>Manual word meaning & sentence always available if API token exhausted</span>
          </div>
        </div>

        {entryMode === 'manual' ? (
          <form onSubmit={handleManualSave} className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-2 font-medium">
                <PenTool className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Manual Vocabulary Entry (No API tokens required)</span>
              </div>
              <span className="text-[11px] text-emerald-400 hidden sm:inline font-mono">100% Offline & Reliable</span>
            </div>

            {manualErrorMsg && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{manualErrorMsg}</span>
              </div>
            )}

            {manualSuccessMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{manualSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Word *
                </label>
                <input
                  type="text"
                  value={manualWord}
                  onChange={(e) => setManualWord(e.target.value)}
                  placeholder="e.g. taciturn, obdurate, ephemeral, mercurial..."
                  className="glass-input w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Part of Speech
                </label>
                <select
                  value={manualPartOfSpeech}
                  onChange={(e) => setManualPartOfSpeech(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-xs rounded-xl font-medium cursor-pointer"
                >
                  <option value="adjective">Adjective</option>
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adverb">Adverb</option>
                  <option value="phrasal verb">Phrasal Verb</option>
                  <option value="idiom">Idiom / Phrase</option>
                </select>
              </div>
            </div>

            {/* Word Meaning and Secondary Meaning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Word Meaning / Definition *</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Primary academic sense</span>
                </label>
                <textarea
                  value={manualMeaning}
                  onChange={(e) => setManualMeaning(e.target.value)}
                  rows={3}
                  placeholder="Enter clear definition (e.g. reserved or uncommunicative in speech; saying little)..."
                  className="glass-input w-full p-3 text-xs rounded-xl leading-relaxed select-text"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Secondary / Nuanced Meaning (Optional)
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-normal">CAT Tested</span>
                </label>
                <textarea
                  value={manualSecondaryMeaning}
                  onChange={(e) => setManualSecondaryMeaning(e.target.value)}
                  rows={3}
                  placeholder="e.g. In philosophical texts, implies deliberate economy of words rather than shy hesitation..."
                  className="glass-input w-full p-3 text-xs text-emerald-300 rounded-xl leading-relaxed select-text"
                />
              </div>
            </div>

            {/* Example Sentence */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>Example Sentence *</span>
                <span className="text-[10px] text-zinc-500 font-normal">Editorial or exam reading sentence</span>
              </label>
              <textarea
                value={manualSentence}
                onChange={(e) => setManualSentence(e.target.value)}
                rows={2}
                placeholder='e.g. "Although he was remarkably taciturn in staff briefings, his written essays were famously passionate and detailed."'
                className="glass-input w-full p-3 text-xs rounded-xl leading-relaxed select-text"
                required
              />
            </div>

            {/* Synonyms, Antonyms, Source */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Synonyms (Comma-separated)
                </label>
                <input
                  type="text"
                  value={manualSynonyms}
                  onChange={(e) => setManualSynonyms(e.target.value)}
                  placeholder="e.g. reticent, reserved, untalkative"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:bg-black focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Antonyms (Comma-separated)
                </label>
                <input
                  type="text"
                  value={manualAntonyms}
                  onChange={(e) => setManualAntonyms(e.target.value)}
                  placeholder="e.g. loquacious, garrulous, talkative"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:bg-black focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Discovery Context / Source Note
                </label>
                <input
                  type="text"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  placeholder="e.g. The Hindu Editorial, VARC Mock 3"
                  className="w-full px-3 py-2 text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:bg-black focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Confidence & Difficulty & Submit */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Initial Confidence:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['Shaky', 'Medium', 'Confident'] as ConfidenceLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setManualConfidence(lvl)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                          manualConfidence === lvl
                            ? getConfidenceBadge(lvl) + ' ring-1 ring-emerald-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Difficulty:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['Easy', 'Medium', 'Advanced'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setManualDifficulty(d)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                          manualDifficulty === d
                            ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualWord('');
                    setManualMeaning('');
                    setManualSentence('');
                    setManualSecondaryMeaning('');
                    setManualSynonyms('');
                    setManualAntonyms('');
                    setManualSource('');
                    setManualErrorMsg('');
                  }}
                  className="px-3.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition"
                >
                  Clear Form
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Save Word to Vault</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleLookup} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter word (e.g. obdurate, pedestrian, mercurial, table)..."
                    className="glass-input w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="submit"
                    disabled={loading || !searchTerm.trim()}
                    className="btn-primary-glass px-5 py-2.5 disabled:opacity-50 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Looking this up...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Look Up Word</span>
                      </>
                    )}
                  </button>

                  {searchTerm.trim() && (
                    <a
                      href={`https://www.google.com/search?q=define+${encodeURIComponent(searchTerm.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 border border-zinc-800 shrink-0"
                      title="Search definition directly on Google"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Google Define</span>
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[11px] text-zinc-500 shrink-0 font-medium">Optional Discovery Context:</span>
                  <input
                    type="text"
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    placeholder="e.g. In today's Philosophy RC passage regarding ethics..."
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 rounded-lg focus:bg-black focus:outline-none focus:border-emerald-500/60 transition"
                  />
                </div>

                {searchTerm.trim() && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span>Quick lookup on:</span>
                    <a
                      href={`https://www.google.com/search?q=define+${encodeURIComponent(searchTerm.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      Google <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <span>&bull;</span>
                    <a
                      href={`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(searchTerm.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                    >
                      Cambridge <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </form>

            {/* Lookup Notice Banner with Instant Manual Switch */}
            {lookupError && (
              <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-2xl text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-100">
                      Word Definition Unavailable Online
                    </span>
                    <span className="text-amber-300">
                      {lookupError}. You can easily enter the word meaning, nuances, and sentence manually.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => switchToManualWithWord(searchTerm, contextInput)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Enter Word & Sentence Manually</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Generated / Editable Word Card */}
        {lookupResult && (
          <div className="mt-5 p-5 sm:p-6 rounded-2xl glass-card border border-emerald-500/20 space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-2xl font-bold text-white tracking-tight capitalize">
                  {lookupResult.word}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {lookupResult.pronunciation}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                  {lookupResult.partOfSpeech}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                  {lookupResult.difficulty}
                </span>

                {lookupResult.source_provider === 'gemini_lexical_engine' && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    AI Lexical Engine
                  </span>
                )}
                {lookupResult.source_provider === 'live_web_dictionary' && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-cyan-400" />
                    Live Web Dictionary
                  </span>
                )}
                {lookupResult.source_provider === 'varc_curated_database' && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                    Curated CAT Lexicon
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/search?q=define+${encodeURIComponent(lookupResult.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-300 hover:text-emerald-300 cursor-pointer"
                  title="Verify with Google Search definition"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>

                <a
                  href={`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(lookupResult.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-zinc-300 hover:text-emerald-300 cursor-pointer"
                  title="Open in Cambridge Academic Dictionary"
                >
                  <span>Cambridge</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>

                {findSavedWord(lookupResult.word) && (
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> In Vault
                  </span>
                )}
              </div>
            </div>

            {/* Meanings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Primary Academic Meaning
                </label>
                <textarea
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  rows={2}
                  className="glass-input w-full p-2.5 text-xs rounded-xl leading-relaxed select-text"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Secondary / Less Common Meaning (CAT Crucial!)
                </label>
                <textarea
                  value={editSecondaryMeaning}
                  onChange={(e) => setEditSecondaryMeaning(e.target.value)}
                  rows={2}
                  className="glass-input w-full p-2.5 text-xs text-emerald-300 rounded-xl leading-relaxed select-text"
                  placeholder="Secondary nuance tested in CAT RC..."
                />
              </div>
            </div>

            {/* Synonyms, Antonyms, Root */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">
                  Synonyms
                </span>
                <div className="flex flex-wrap gap-1">
                  {lookupResult.synonyms?.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">
                  Antonyms
                </span>
                <div className="flex flex-wrap gap-1">
                  {lookupResult.antonyms?.map((a: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Etymology / Root
                </span>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  {lookupResult.root || 'Classical origin'}
                </p>
              </div>
            </div>

            {/* Sentences & Personal Notes */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  CAT Editorial Reading Comprehension Example
                </label>
                <textarea
                  value={editExampleSentence}
                  onChange={(e) => setEditExampleSentence(e.target.value)}
                  rows={2}
                  className="w-full p-3 text-xs glass-input text-zinc-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    My Personal Sentence / Memory Trigger
                  </label>
                  <input
                    type="text"
                    value={editPersonalSentence}
                    onChange={(e) => setEditPersonalSentence(e.target.value)}
                    placeholder="e.g. Stumbled upon this in today's The Hindu editorial..."
                    className="w-full px-3 py-2.5 text-xs glass-input text-zinc-200 placeholder-zinc-500 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Initial Confidence Rating
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Shaky', 'Medium', 'Confident'] as ConfidenceLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEditConfidence(level)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                          editConfidence === level
                            ? getConfidenceBadge(level) + ' ring-1 ring-emerald-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLookupResult(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={handleSaveToVault}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Saved to Vault!</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Save to My Vocabulary Vault</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Vault Statistics & Mastery Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setSelectedConfidenceFilter('ALL');
            setShowOnlyRevisionDue(false);
          }}
          className={`p-4 rounded-2xl glass-card transition-all cursor-pointer ${
            selectedConfidenceFilter === 'ALL' && !showOnlyRevisionDue
              ? 'border-emerald-500/40 bg-emerald-500/[0.04] shadow-lg shadow-emerald-950/20'
              : 'border-white/[0.08] hover:border-white/[0.14]'
          }`}
        >
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Vault Library
          </span>
          <span className="text-2xl font-bold text-white tracking-tight tabular-nums mt-1 block">
            {stats.total} words
          </span>
          <span className="text-[11px] text-emerald-400 font-medium tabular-nums">{stats.masteryScore}% retention score</span>
        </div>

        <div
          onClick={() => {
            setSelectedConfidenceFilter('Shaky');
            setShowOnlyRevisionDue(false);
          }}
          className={`p-4 rounded-2xl glass-card transition-all cursor-pointer ${
            selectedConfidenceFilter === 'Shaky' && !showOnlyRevisionDue
              ? 'border-rose-500/40 bg-rose-500/[0.04] shadow-lg shadow-rose-950/20'
              : 'border-white/[0.08] hover:border-white/[0.14]'
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
            Shaky Words
          </span>
          <span className="text-2xl font-bold text-rose-400 tracking-tight tabular-nums mt-1 block">
            {stats.shaky} words
          </span>
          <span className="text-[11px] text-rose-400/80">High exam priority</span>
        </div>

        <div
          onClick={() => {
            setSelectedConfidenceFilter('Medium');
            setShowOnlyRevisionDue(false);
          }}
          className={`p-4 rounded-2xl glass-card transition-all cursor-pointer ${
            selectedConfidenceFilter === 'Medium' && !showOnlyRevisionDue
              ? 'border-amber-500/40 bg-amber-500/[0.04] shadow-lg shadow-amber-950/20'
              : 'border-white/[0.08] hover:border-white/[0.14]'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            Medium Words
          </span>
          <span className="text-2xl font-bold text-amber-300 tracking-tight tabular-nums mt-1 block">
            {stats.medium} words
          </span>
          <span className="text-[11px] text-amber-400/80">Needs 1 more quiz</span>
        </div>

        <div
          onClick={() => {
            setShowOnlyRevisionDue(true);
            setSelectedConfidenceFilter('ALL');
          }}
          className={`p-4 rounded-2xl glass-card transition-all cursor-pointer ${
            showOnlyRevisionDue
              ? 'border-emerald-500/40 bg-emerald-500/[0.04] shadow-lg shadow-emerald-950/20'
              : 'border-white/[0.08] hover:border-white/[0.14]'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Due for Revision
          </span>
          <span className="text-2xl font-bold text-emerald-400 tracking-tight tabular-nums mt-1 block">
            {stats.dueForRevision} words
          </span>
          <span className="text-[11px] text-emerald-400/80 font-medium">Click to filter</span>
        </div>
      </div>

      {/* 5. Library Explorer Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder="Search within saved vocabulary..."
            className="glass-input w-full pl-9 pr-4 py-2 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Confidence filters */}
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
            {(['ALL', 'Shaky', 'Medium', 'Confident'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedConfidenceFilter(lvl);
                  setShowOnlyRevisionDue(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedConfidenceFilter === lvl && !showOnlyRevisionDue
                    ? 'bg-white/[0.14] text-white border border-white/[0.18] font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-zinc-300 font-medium cursor-pointer"
          >
            <option value="recent">Recently Added</option>
            <option value="alpha">Alphabetical (A-Z)</option>
            <option value="confidence">Weakest First</option>
            <option value="difficulty">Difficulty (Hard first)</option>
          </select>
        </div>
      </div>

      {/* 6. Word Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="p-12 text-center rounded-3xl glass-card border border-white/[0.08] text-zinc-400">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="font-semibold text-white text-base">Your Vocabulary Vault is Fresh & Empty</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Search for any word in the dictionary bar above to explore authentic definitions, contextual usage, and verified Google/Cambridge meanings, then save them directly to your vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((w) => (
            <div
              key={w.id}
              onClick={() => openWordModal(w)}
              className="p-4 rounded-2xl glass-card border border-white/[0.08] hover:border-white/[0.18] flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-lg text-white capitalize group-hover:text-emerald-300 transition-colors">
                      {w.word}
                    </h4>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {w.pronunciation} &bull; {w.partOfSpeech}
                    </span>
                  </div>

                  {/* Confidence selector */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const next: Record<ConfidenceLevel, ConfidenceLevel> = {
                        Shaky: 'Medium',
                        Medium: 'Confident',
                        Confident: 'Shaky',
                      };
                      updateConfidence(w.id, next[w.confidence]);
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider cursor-pointer hover:opacity-80 transition ${getConfidenceBadge(
                      w.confidence
                    )}`}
                    title="Click to cycle confidence rating"
                  >
                    {w.confidence}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 line-clamp-2 mt-2 leading-relaxed select-text">
                  {w.meaning}
                </p>

                {w.secondaryMeaning && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-500/[0.08] p-2 rounded-xl border border-emerald-500/20 mt-2 line-clamp-2 select-text">
                    <span className="font-semibold text-emerald-400">Secondary: </span>
                    {w.secondaryMeaning}
                  </p>
                )}

                {/* Synonyms */}
                {w.synonyms && w.synonyms.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {w.synonyms.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom metadata */}
              <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
                <span className="truncate max-w-[150px]">{w.source || 'Vault word'}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-400">
                    {w.testsCount > 0 ? `${w.correctCount}/${w.testsCount} correct` : 'Untested'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWord(w.id, w.word);
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition"
                    title="Delete word"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Detailed Word Modal / Drawer */}
      {selectedWordModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedWordModal(null)}
        >
          <div
            className="glass-panel rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-white capitalize tracking-tight">
                    {selectedWordModal.word}
                  </h3>
                  <a
                    href={`https://www.google.com/search?q=define+${encodeURIComponent(selectedWordModal.word)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-white/[0.06] transition"
                    title="Search definition on Google"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {selectedWordModal.pronunciation} &bull; {selectedWordModal.partOfSpeech} &bull;{' '}
                  {selectedWordModal.difficulty}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingModalWord(!isEditingModalWord)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition flex items-center gap-1 ${
                    isEditingModalWord
                      ? 'bg-white/[0.15] text-white border-white/[0.25] font-bold shadow-xs'
                      : 'btn-glass text-zinc-300'
                  }`}
                  title="Edit word meaning or sentence"
                >
                  <PenTool className="w-3 h-3" />
                  <span>{isEditingModalWord ? 'Done' : 'Edit'}</span>
                </button>

                {(['Shaky', 'Medium', 'Confident'] as ConfidenceLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      updateConfidence(selectedWordModal.id, lvl);
                      setSelectedWordModal({ ...selectedWordModal, confidence: lvl });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      selectedWordModal.confidence === lvl
                        ? getConfidenceBadge(lvl)
                        : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {isEditingModalWord ? (
              <div className="space-y-3.5 py-1 animate-in fade-in duration-150">
                <div className="p-2.5 glass-card rounded-xl text-xs text-zinc-200 flex items-center justify-between font-medium">
                  <span>Edit Meaning & Sentences for "{selectedWordModal.word}"</span>
                  {modalEditSuccess && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Word Meaning / Definition *
                  </label>
                  <textarea
                    value={modalEditMeaning}
                    onChange={(e) => setModalEditMeaning(e.target.value)}
                    rows={3}
                    className="w-full p-3 text-xs glass-input text-zinc-100 rounded-xl leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Secondary / Nuanced Meaning
                  </label>
                  <textarea
                    value={modalEditSecondaryMeaning}
                    onChange={(e) => setModalEditSecondaryMeaning(e.target.value)}
                    rows={2}
                    className="w-full p-3 text-xs glass-input text-emerald-300 rounded-xl leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Example Sentence
                  </label>
                  <textarea
                    value={modalEditExampleSentence}
                    onChange={(e) => setModalEditExampleSentence(e.target.value)}
                    rows={2}
                    className="w-full p-3 text-xs glass-input text-zinc-100 rounded-xl leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Student Context / Source Note
                  </label>
                  <input
                    type="text"
                    value={modalEditPersonalSentence}
                    onChange={(e) => setModalEditPersonalSentence(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs glass-input text-zinc-100 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingModalWord(false)}
                    className="btn-glass px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleModalEditSave}
                    className="btn-primary-glass px-4 py-2 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Meanings */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Primary Definition
                    </span>
                    <p className="text-sm text-zinc-200 leading-relaxed glass-card p-3.5 rounded-xl">
                      {selectedWordModal.meaning}
                    </p>
                  </div>

                  {selectedWordModal.secondaryMeaning && (
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                        Secondary / Nuance Definition (Exam Tested)
                      </span>
                      <p className="text-sm text-emerald-300 leading-relaxed bg-emerald-500/[0.08] p-3.5 rounded-xl border border-emerald-500/20">
                        {selectedWordModal.secondaryMeaning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Etymology & Root */}
                {selectedWordModal.root && (
                  <div className="p-3.5 glass-card rounded-xl text-xs text-zinc-300">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                      Etymology / Root
                    </span>
                    <span>{selectedWordModal.root}</span>
                  </div>
                )}

                {/* Synonyms & Antonyms */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 glass-card rounded-xl text-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Synonyms
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedWordModal.synonyms?.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 text-[11px] border border-white/[0.08]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 glass-card rounded-xl text-xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Antonyms
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedWordModal.antonyms?.map((a, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 text-[11px] border border-white/[0.08]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Example sentence */}
                {selectedWordModal.exampleSentence && (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Reading Comprehension Context
                    </span>
                    <p className="text-xs text-zinc-300 italic glass-card p-3.5 rounded-xl leading-relaxed">
                      "{selectedWordModal.exampleSentence}"
                    </p>
                  </div>
                )}

                {/* Personal sentence */}
                {selectedWordModal.personalSentence && (
                  <div className="text-xs text-zinc-400">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                      Student Context / Discovery Note
                    </span>
                    <span>{selectedWordModal.personalSentence}</span>
                  </div>
                )}

                {/* Test statistics for this word */}
                <div className="p-3.5 glass-card rounded-xl flex items-center justify-between text-xs text-zinc-400 tabular-nums">
                  <span>Tests taken: {selectedWordModal.testsCount}</span>
                  <span>
                    Accuracy:{' '}
                    {selectedWordModal.testsCount > 0
                      ? `${Math.round((selectedWordModal.correctCount / selectedWordModal.testsCount) * 100)}%`
                      : 'N/A'}
                  </span>
                  <span>Correct: {selectedWordModal.correctCount}</span>
                  <span>Incorrect: {selectedWordModal.incorrectCount}</span>
                </div>
              </>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteWord(selectedWordModal.id, selectedWordModal.word)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Word
                </button>

                <a
                  href={`https://www.google.com/search?q=define+${encodeURIComponent(selectedWordModal.word)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Search on Google
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <button
                onClick={() => setSelectedWordModal(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
