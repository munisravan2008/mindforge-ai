export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
}

export interface UserPreferences {
  userId: string;
  preferredLanguage: string;
  learningGoal: string;
  studyMethods: string[];
  defaultDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  defaultQuizQuestionCount: number;
  theme: 'dark' | 'light' | 'system';
}

export interface Source {
  id: string;
  userId: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'youtube' | 'notes';
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  videoUrl?: string;
  processingStatus: 'uploaded' | 'extracting' | 'preparing_ai' | 'ready' | 'failed';
  errorMessage?: string;
  summary?: string;
  topicOutline?: string[];
  keyConcepts?: { term: string; definition: string }[];
  definitions?: { term: string; definition: string; context?: string }[];
  wordCount: number;
  chunkCount: number;
  deckCount?: number;
  quizCount?: number;
  notesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceChunk {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  timestamp?: string;
  heading?: string;
  tokenCount?: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sourceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  explanation?: string;
  sourceReference?: string;
  pageNumber?: number;
  timestamp?: string;
  reviewState: 'new' | 'known' | 'needs_review';
  repetitionLevel: number;
  nextReviewDate?: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  sourceId?: string;
  collectionId?: string;
  title: string;
  description?: string;
  totalCards?: number;
  knownCount?: number;
  reviewCount?: number;
  newCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correctAnswer?: string; // May be omitted when taking assessment
  explanation?: string;
  sourceReference?: string;
  pageNumber?: number;
  topic?: string;
  questionOrder: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  totalQuestions: number;
  score: number;
  percentage: number;
  timeTakenSeconds: number;
}

export interface Quiz {
  id: string;
  userId: string;
  sourceId?: string;
  collectionId?: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  timerSeconds?: number;
  mode: 'practice' | 'assessment';
  questionCount?: number;
  attemptsCount?: number;
  bestScore?: number | null;
  createdAt: string;
}

export interface QuizResultItem {
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  sourceReference?: string;
  pageNumber?: number;
  topic?: string;
}

export interface Citation {
  chunkId?: string;
  sourceTitle: string;
  pageNumber?: number;
  timestamp?: string;
  quote?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedFollowUps?: string[];
  createdAt: string;
}

export interface TutorConversation {
  id: string;
  userId: string;
  sourceId?: string;
  collectionId?: string;
  title: string;
  messageCount?: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyNote {
  id: string;
  userId: string;
  sourceId?: string;
  sourceTitle?: string;
  title: string;
  formatType: 'one_paragraph' | 'detailed' | 'chapter_notes' | 'revision_notes' | 'key_takeaways' | 'definitions' | 'formulas' | 'comparison_table' | 'exam_revision';
  content: string;
  sections?: { heading: string; body: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsData {
  metrics: {
    totalStudySessions: number;
    totalSources: number;
    flashcardsReviewed: number;
    quizzesCompleted: number;
    averageQuizAccuracy: number;
    totalCardsCount: number;
    knownCardsCount: number;
    dueCardsCount: number;
    currentStreak?: number;
    longestStreak?: number;
    hasStudiedToday?: boolean;
  };
  dailyActivity: {
    date: string;
    formattedDate?: string;
    count: number;
    studyMinutes: number;
    mastery?: number;
  }[];
  streakInfo?: {
    currentStreak: number;
    longestStreak: number;
    hasStudiedToday: boolean;
    nextMilestone: number;
    daysToMilestone: number;
    weekDays: {
      date: string;
      formattedDate?: string;
      dayLabel: string;
      dayName: string;
      isToday: boolean;
      hasStudied: boolean;
      count: number;
      studyMinutes: number;
    }[];
  };
  topicsPracticed: string[];
  missedConcepts: {
    question: string;
    topic: string;
    sourceReference?: string;
  }[];
  recentActivity: {
    id: string;
    activityType: string;
    metadata?: any;
    durationSeconds?: number;
    createdAt: string;
  }[];
}
