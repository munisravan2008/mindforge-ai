import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  preferredLanguage: string;
  learningGoal: string; // 'exam_prep' | 'college' | 'competitive_exams' | 'professional' | 'general'
  studyMethods: string[]; // ['flashcards', 'quizzes', 'summaries', 'tutor']
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
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSource {
  id: string;
  collectionId: string;
  sourceId: string;
  addedAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  sourceId?: string;
  collectionId?: string;
  title: string;
  description?: string;
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
  repetitionLevel: number; // 0 to 5 spaced-repetition stage
  nextReviewDate?: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardReviewHistory {
  id: string;
  userId: string;
  flashcardId: string;
  deckId: string;
  outcome: 'known' | 'needs_review';
  reviewTimeMs?: number;
  reviewedAt: string;
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
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[]; // for mcq
  correctAnswer: string;
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

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  submittedAnswer: string;
  isCorrect: boolean;
  feedback?: string;
  points: number;
}

export interface TutorConversation {
  id: string;
  userId: string;
  sourceId?: string;
  collectionId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

export interface StudyNote {
  id: string;
  userId: string;
  sourceId?: string;
  title: string;
  formatType: 'one_paragraph' | 'detailed' | 'chapter_notes' | 'revision_notes' | 'key_takeaways' | 'definitions' | 'formulas' | 'comparison_table' | 'exam_revision' | 'practice_questions';
  content: string;
  sections?: { heading: string; body: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyActivity {
  id: string;
  userId: string;
  activityType: 'flashcard_review' | 'quiz_completed' | 'source_uploaded' | 'tutor_session' | 'notes_generated';
  metadata?: any;
  durationSeconds?: number;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  userPreferences: UserPreferences[];
  sources: Source[];
  sourceChunks: SourceChunk[];
  collections: Collection[];
  collectionSources: CollectionSource[];
  flashcardDecks: FlashcardDeck[];
  flashcards: Flashcard[];
  flashcardReviewHistory: FlashcardReviewHistory[];
  quizzes: Quiz[];
  quizQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  quizResponses: QuizResponse[];
  tutorConversations: TutorConversation[];
  chatMessages: ChatMessage[];
  studyNotes: StudyNote[];
  studyActivity: StudyActivity[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mindforge_db.json');

class DatabaseEngine {
  public data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private getEmptySchema(): DatabaseSchema {
    return {
      users: [],
      userPreferences: [],
      sources: [],
      sourceChunks: [],
      collections: [],
      collectionSources: [],
      flashcardDecks: [],
      flashcards: [],
      flashcardReviewHistory: [],
      quizzes: [],
      quizQuestions: [],
      quizAttempts: [],
      quizResponses: [],
      tutorConversations: [],
      chatMessages: [],
      studyNotes: [],
      studyActivity: [],
    };
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...this.getEmptySchema(), ...parsed };
      }
    } catch (err) {
      console.error('Error loading db file, initializing fresh:', err);
    }
    const fresh = this.getEmptySchema();
    this.save(fresh);
    return fresh;
  }

  public save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // Accessors
  get users() { return this.data.users; }
  get userPreferences() { return this.data.userPreferences; }
  get sources() { return this.data.sources; }
  get sourceChunks() { return this.data.sourceChunks; }
  get collections() { return this.data.collections; }
  get collectionSources() { return this.data.collectionSources; }
  get flashcardDecks() { return this.data.flashcardDecks; }
  get flashcards() { return this.data.flashcards; }
  get flashcardReviewHistory() { return this.data.flashcardReviewHistory; }
  get quizzes() { return this.data.quizzes; }
  get quizQuestions() { return this.data.quizQuestions; }
  get quizAttempts() { return this.data.quizAttempts; }
  get quizResponses() { return this.data.quizResponses; }
  get tutorConversations() { return this.data.tutorConversations; }
  get chatMessages() { return this.data.chatMessages; }
  get studyNotes() { return this.data.studyNotes; }
  get studyActivity() { return this.data.studyActivity; }

  public resetToEmpty() {
    this.data = this.getEmptySchema();
    this.save();
  }
}

export const db = new DatabaseEngine();
