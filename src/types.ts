export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  studentId: string; // Business identifier e.g. "CAT2701-01"
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  batchId?: string; // e.g. 'B-CAT2701'
  mentor?: string;
  createdAt: string;
  lastLoginAt?: string;
  currentPassword?: string;
}

export type CATSection = 'VARC' | 'DILR' | 'QUANTS';
// Backwards compatibility alias
export type Subject = CATSection | 'QUANT';

export type TaskPriority = 'Normal' | 'Important' | 'Urgent';
export type TaskPublishStatus = 'draft' | 'published' | 'archived';
export type TaskExecutionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type DeadlineState = 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED_LATE';

export interface PdfAttachment {
  name: string;
  url: string;
  sizeFormatted: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface ClassTask {
  id: string;
  section: CATSection;
  subject?: Subject; // alias
  topic: string; // e.g. "Reading Comprehension: Reading for Purpose"
  subtopic: string; // e.g. "VA 1.2"
  title: string;
  shortDescription: string;
  instructions: string;
  givenInLecture: string;
  taskType?: 'Assignment' | 'Practice' | 'Revision' | 'Lecture Prep';
  assignedDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // HH:mm (24h)
  submissionDate?: string;
  submissionLecture?: string;
  submissionMethod: string;
  additionalNotes?: string;
  priority: TaskPriority;
  status: TaskPublishStatus;
  estimatedMinutes?: number;
  assignedScope?: 'all' | 'specific';
  assignedStudentUids?: string[];
  linkedTestId?: string;
  scheduleActivityId?: string;
  attachmentUrl?: string;
  pdfAttachment?: PdfAttachment;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  studentUid: string;
  studentName?: string;
  status: TaskExecutionStatus;
  completedAt?: string;
  completedLate?: boolean;
  updatedAt: string;
}

export interface TaskProgress {
  taskId: string;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
}

export interface PersonalTask {
  id: string;
  userId: string;
  studentUid?: string;
  section: CATSection | 'General';
  subject?: Subject | 'General'; // alias
  title: string;
  notes?: string;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime?: string; // HH:mm
  priority: TaskPriority;
  status?: TaskExecutionStatus;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Canonical CAT Schedule
export interface ScheduleActivity {
  id: string;
  batchId: string; // 'B-CAT2701'
  mentor?: string;
  date: string; // YYYY-MM-DD
  day: string; // "Tuesday", "Thursday", "Saturday"
  timeRange: string; // "4:00 pm to 6:00 pm"
  startTime: string; // "16:00"
  endTime: string; // "18:00"
  section: CATSection | 'EVENT' | 'BREAK';
  subtopicCode: string; // e.g. 'VA 1.1', 'QA', 'VA 1.2', 'LR 1.1+1.2', 'QA 1.5A', etc.
  topic: string;
  mode: 'Offline' | 'Online';
  linkedTaskIds?: string[];
  linkedTestIds?: string[];
  notes?: string;
}

// Student Private Dictionary
export type WordMastery = 'Learning' | 'Review' | 'Mastered';
export type ConfidenceLevel = 'Shaky' | 'Medium' | 'Confident';

export interface VocabWord {
  id: string;
  userId: string;
  studentUid?: string;
  word: string;
  meaning: string;
  secondaryMeaning: string;
  partOfSpeech: string;
  pronunciation: string;
  synonyms: string[];
  antonyms: string[];
  root: string;
  exampleSentence: string;
  personalSentence?: string;
  source?: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  mastery?: WordMastery;
  confidence: ConfidenceLevel;
  testsCount: number;
  correctCount: number;
  incorrectCount: number;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}

// Tests & Assessments
export type TestType = 'Official Diagnostic' | 'Practice Drill' | 'AI Personalized Drill' | 'Dictionary Test';

export interface TestQuestion {
  id: string;
  type: string;
  typeLabel?: string;
  targetWord?: string; // For dictionary test
  question: string;
  context?: string; // e.g. Reading passage or DILR set description / data table
  options: string[]; // 4 choices
}

export interface CATTest {
  id: string;
  title: string;
  section: CATSection;
  topic: string;
  subtopic: string;
  testType: TestType;
  durationMinutes: number;
  totalMarks: number;
  questionsCount: number;
  studentUid?: string | null; // null for class-wide tests, student UID for private AI/dictionary tests
  isPublished: boolean;
  questions: TestQuestion[];
  createdAt: string;
}

// Client question type alias for VocabTest
export interface VocabQuestion extends TestQuestion {
  correctIndex?: number;
  explanation?: string;
}

export interface TestAttemptResult {
  id: string;
  studentUid: string;
  testId: string;
  testTitle: string;
  section: CATSection;
  topic: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracy: number;
  timeSpentSeconds: number;
  topicBreakdown?: Record<string, { correct: number; total: number }>;
  weakAreas?: string[];
  recommendations?: string;
  submittedAt: string;
  // Details for review after submission
  answers?: Record<string, number>;
  detailedReview?: Array<{
    questionId: string;
    question: string;
    context?: string;
    options: string[];
    userChoice: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export interface VocabTestResult {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  wordsTested: string[];
  incorrectWords: string[];
  difficulty: string;
  date: string;
  recommendations: string;
}

// Real-time Notifications
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'TASK_COMPLETED'
  | 'TEST_RESULT'
  | 'SCHEDULE_UPDATE'
  | 'VOCAB_REMINDER';

export interface NotificationItem {
  id: string;
  recipientUid: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: 'task' | 'test' | 'schedule' | 'vocab';
  entityId?: string;
  read: boolean;
  createdAt: string;
}

// Community Feed
export type FeedCategory =
  | 'General'
  | 'Assignment & Deadlines'
  | 'VARC'
  | 'DILR'
  | 'QUANTS'
  | 'QUANT'
  | 'Doubt & Discussion';

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  content: string;
  category: FeedCategory;
  upvotes: number;
  upvotedUserIds?: string[];
  comments?: FeedComment[];
  commentCount?: number;
  isPinned?: boolean;
  pdfAttachment?: PdfAttachment;
  createdAt: string;
  updatedAt: string;
}

export type ActiveView =
  | 'dashboard'
  | 'schedule'
  | 'calendar'
  | 'varc'
  | 'dilr'
  | 'quants'
  | 'my-tasks'
  | 'tests'
  | 'test-session'
  | 'test-history'
  | 'community'
  | 'profile'
  | 'admin-create'
  | 'admin-manage'
  | 'admin-students'
  | 'admin-schedule'
  | 'admin-stats'
  // Compatibility views
  | 'feed'
  | 'varc-vocab'
  | 'varc-test'
  | 'varc-tasks'
  | 'dilr-tasks'
  | 'quant-tasks'
  | 'admin-users';

export interface TaskFilterOptions {
  section?: CATSection | 'ALL';
  subject?: Subject | 'ALL';
  status?: 'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE';
  searchQuery?: string;
  sortBy?: 'deadline' | 'assigned' | 'priority' | 'section';
}
