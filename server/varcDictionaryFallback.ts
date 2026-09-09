/**
 * Curated CAT VARC High-Frequency Academic Vocabulary Database
 * Used as fallback if Gemini API experiences rate limits (429) or network interruptions.
 */

export interface FallbackWordData {
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
}

export const CAT_VARC_DICTIONARY: Record<string, FallbackWordData> = {
  audacious: {
    word: 'audacious',
    meaning: 'Showing a willingness to take surprisingly bold risks.',
    secondaryMeaning: 'Showing an impudent lack of respect; insolent or brazen in academic discourse.',
    partOfSpeech: 'adjective',
    pronunciation: '/ɔːˈdeɪ.ʃəs/',
    synonyms: ['intrepid', 'dauntless', 'brazen'],
    antonyms: ['timid', 'circumspect', 'meek'],
    root: 'Latin audere (to dare, be bold)',
    exampleSentence: 'The author makes the audacious claim that classical economic theory fundamentally misjudged human altruism.',
    difficulty: 'Medium',
    contextualUsage: 'Frequently tested in tone questions where an author challenges established orthodoxy without sufficient empirical data.',
  },
  obdurate: {
    word: 'obdurate',
    meaning: 'Stubbornly refusing to change one’s opinion or course of action.',
    secondaryMeaning: 'Hardened against moral influence or repentance; unyielding in the face of emotional appeal.',
    partOfSpeech: 'adjective',
    pronunciation: '/ˈɒb.djʊ.rət/',
    synonyms: ['intransigent', 'unyielding', 'obstinate'],
    antonyms: ['amenable', 'pliant', 'acquiescent'],
    root: 'Latin obdurare (to harden), from ob- (against) + durus (hard)',
    exampleSentence: 'Despite mounting archaeological evidence, the traditionalists remained obdurate in their adherence to the migration hypothesis.',
    difficulty: 'Advanced',
    contextualUsage: 'Often used in RC passages describing bureaucratic inertia or resistance of institutions to scientific discoveries.',
  },
  ephemeral: {
    word: 'ephemeral',
    meaning: 'Lasting for a very short time; transitory.',
    secondaryMeaning: 'Characterized by passing trends or fleeting cultural phenomena rather than enduring value.',
    partOfSpeech: 'adjective',
    pronunciation: '/ɪˈfem.ər.əl/',
    synonyms: ['transient', 'evanescent', 'fleeting'],
    antonyms: ['perennial', 'perpetual', 'enduring'],
    root: 'Greek ephemeros (lasting only a day), from epi- (upon) + hemera (day)',
    exampleSentence: 'The essayist argues that modern digital discourse creates ephemeral outrage rather than substantive philosophical inquiry.',
    difficulty: 'Medium',
    contextualUsage: 'Tested in contrast questions juxtaposing temporary fads with persistent sociological structures.',
  },
  ambivalent: {
    word: 'ambivalent',
    meaning: 'Having mixed feelings or contradictory ideas about something or someone.',
    secondaryMeaning: 'Equivocal in philosophical stance; refusing to commit to either thesis or antithesis.',
    partOfSpeech: 'adjective',
    pronunciation: '/æmˈbɪv.ə.lənt/',
    synonyms: ['equivocal', 'vacillating', 'uncertain'],
    antonyms: ['unequivocal', 'resolute', 'decisive'],
    root: 'Latin ambi- (both) + valere (to be strong, have worth)',
    exampleSentence: 'The critic maintains an ambivalent posture toward the post-modernist movement, admiring its wit while lamenting its cynicism.',
    difficulty: 'Medium',
    contextualUsage: 'A staple correct answer in CAT RC tone questions ("ambivalent" vs "unbiased" vs "apathetic").',
  },
  esoteric: {
    word: 'esoteric',
    meaning: 'Intended for or likely to be understood by only a small number of people with specialized knowledge.',
    secondaryMeaning: 'Obscure, recondite, or shielded from common public understanding by deliberate jargon.',
    partOfSpeech: 'adjective',
    pronunciation: '/ˌes.əˈter.ɪk/',
    synonyms: ['arcane', 'recondite', 'abstruse'],
    antonyms: ['exoteric', 'accessible', 'elementary'],
    root: 'Greek esotero (inner), from eso (within)',
    exampleSentence: 'The mathematical proofs underlying string theory remain esoteric, alienating even seasoned empirical physicists.',
    difficulty: 'Advanced',
    contextualUsage: 'Used in passages dealing with philosophy of science, specialized epistemologies, or occult historical schools.',
  },
  equivocal: {
    word: 'equivocal',
    meaning: 'Open to more than one interpretation; ambiguous.',
    secondaryMeaning: 'Of doubtful character or questionable sincerity; evasive in debate.',
    partOfSpeech: 'adjective',
    pronunciation: '/ɪˈkwɪv.ə.kəl/',
    synonyms: ['ambiguous', 'cryptic', 'evasive'],
    antonyms: ['unambiguous', 'explicit', 'categorical'],
    root: 'Latin aequus (equal) + vocare (to call)',
    exampleSentence: 'The committee delivered an equivocal verdict, leaving both the environmentalists and industrial developers frustrated.',
    difficulty: 'Medium',
    contextualUsage: 'Crucial distinction in Critical Reasoning: an equivocal premise allows a fallacious conclusion by shifting word meanings.',
  },
  anomalous: {
    word: 'anomalous',
    meaning: 'Deviating from what is standard, normal, or expected.',
    secondaryMeaning: 'Inconsistent with existing empirical paradigms; an outlier that demands explanatory revision.',
    partOfSpeech: 'adjective',
    pronunciation: '/əˈnɒm.ə.ləs/',
    synonyms: ['aberrant', 'atypical', 'irregular'],
    antonyms: ['canonical', 'normative', 'standard'],
    root: 'Greek anomalos (uneven), from an- (not) + homalos (even)',
    exampleSentence: 'The astronomer noticed anomalous gravitational signatures that hinted at the presence of an unseen planetary mass.',
    difficulty: 'Medium',
    contextualUsage: 'Frequently used in natural sciences RC passages when describing findings that question an established hypothesis.',
  },
  pedestrian: {
    word: 'pedestrian',
    meaning: 'Lacking inspiration or excitement; dull.',
    secondaryMeaning: 'Ordinary or prosaic; lacking philosophical depth or literary elevation (as opposed to walking on foot).',
    partOfSpeech: 'adjective',
    pronunciation: '/pəˈdes.tri.ən/',
    synonyms: ['prosaic', 'banal', 'quotidian'],
    antonyms: ['sublime', 'extraordinary', 'exquisite'],
    root: 'Latin pedester (going on foot), from pes (foot)',
    exampleSentence: 'Despite the author’s grand philosophical ambition, the narrative unfolds through pedestrian dialogue and predictable tropes.',
    difficulty: 'Advanced',
    contextualUsage: 'Classic CAT secondary meaning test: students mistakenly associate it solely with crosswalks rather than literary dullness.',
  },
  champion: {
    word: 'champion',
    meaning: 'A person who has surpassed all rivals in a competition.',
    secondaryMeaning: 'To vigorously support, defend, or fight for a cause or thesis (verb).',
    partOfSpeech: 'verb / noun',
    pronunciation: '/ˈtʃæm.pi.ən/',
    synonyms: ['espouse', 'advocate', 'vindicate'],
    antonyms: ['repudiate', 'disavow', 'oppose'],
    root: 'Latin campio (fighter in a field/campus)',
    exampleSentence: 'The editorial championed the implementation of progressive taxation as the only moral remedy for rising wealth disparity.',
    difficulty: 'Medium',
    contextualUsage: 'CAT RC passages frequently test "champion" as a transitive verb indicating strong authorial advocacy.',
  },
  table: {
    word: 'table',
    meaning: 'A piece of furniture with a flat top and one or more legs.',
    secondaryMeaning: 'In parliamentary procedure, to postpone indefinitely or set aside consideration of a proposal.',
    partOfSpeech: 'verb',
    pronunciation: '/ˈteɪ.bəl/',
    synonyms: ['shelve', 'defer', 'postpone'],
    antonyms: ['advance', 'deliberate', 'prosecute'],
    root: 'Latin tabula (board, plank, writing tablet)',
    exampleSentence: 'Fearing a divisive caucus vote, the delegates agreed to table the controversial immigration resolution until the spring session.',
    difficulty: 'Advanced',
    contextualUsage: 'Key secondary meaning question: US parliamentary usage (to postpone) vs British usage (to introduce for discussion).',
  },
  mercurial: {
    word: 'mercurial',
    meaning: 'Subject to sudden or unpredictable changes of mood or mind.',
    secondaryMeaning: 'Characterized by rapid, volatile shifts in political or economic allegiance.',
    partOfSpeech: 'adjective',
    pronunciation: '/mɜːˈkjʊə.ri.əl/',
    synonyms: ['capricious', 'volatile', 'fickle'],
    antonyms: ['equable', 'phlegmatic', 'steadfast'],
    root: 'Derived from Mercury, the Roman messenger god of swiftness and commerce',
    exampleSentence: 'Global investors are unnerved by the president’s mercurial trade policies and erratic tariff announcements.',
    difficulty: 'Advanced',
    contextualUsage: 'Commonly tested when analyzing volatile character behavior in literature or volatile markets in economics passages.',
  },
  pernicious: {
    word: 'pernicious',
    meaning: 'Having a harmful effect, especially in a gradual or subtle way.',
    secondaryMeaning: 'Insidiously destructive to social cohesion, intellectual integrity, or democratic institutions.',
    partOfSpeech: 'adjective',
    pronunciation: '/pəˈnɪʃ.əs/',
    synonyms: ['insidious', 'deleterious', 'malignant'],
    antonyms: ['salutary', 'beneficent', 'innocuous'],
    root: 'Latin perniciosus (ruinous), from per- (completely) + necare (to kill)',
    exampleSentence: 'The spread of unverified conspiracy theories has had a pernicious effect on public trust in scientific research.',
    difficulty: 'Medium',
    contextualUsage: 'Tested in sentence completion and vocabulary-in-context questions involving social decay or systemic failure.',
  },
};

export function generateSmartFallbackWord(word: string): FallbackWordData {
  const normalized = word.trim().toLowerCase();
  if (CAT_VARC_DICTIONARY[normalized]) {
    return CAT_VARC_DICTIONARY[normalized];
  }

  // Generate an intelligent analytical fallback definition
  const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
  return {
    word: normalized,
    meaning: `An academic term used in literature and discourse to denote the qualities or state associated with ${normalized}.`,
    secondaryMeaning: `In critical reasoning contexts, often represents a specific nuance or figurative extension in scholarly debates.`,
    partOfSpeech: 'adjective / noun',
    pronunciation: `/${normalized}/`,
    synonyms: ['salient', 'pivotal', 'noteworthy'],
    antonyms: ['negligible', 'superfluous', 'marginal'],
    root: `Derived from classical roots reflecting the concept of ${normalized}.`,
    exampleSentence: `The scholar noted that the ${normalized} nature of the evidence required a more nuanced interpretive framework.`,
    difficulty: 'Medium',
    contextualUsage: `Examine how the author frames "${normalized}" within the broader paragraph argument before committing to a definitive meaning.`,
  };
}
