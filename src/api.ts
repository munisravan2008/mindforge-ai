import {
  User,
  UserPreferences,
  Source,
  SourceChunk,
  Collection,
  FlashcardDeck,
  Flashcard,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizResultItem,
  TutorConversation,
  ChatMessage,
  StudyNote,
  AnalyticsData,
} from './types';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('mf_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      if (contentType.includes('application/json')) {
        try {
          const errorData = await res.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch {
          // use default message
        }
      } else {
        const text = await res.text().catch(() => '');
        if (res.status === 401) {
          errorMsg = 'Authentication required. Please sign in or use the Judge Demo mode.';
        } else if (res.status === 413) {
          errorMsg = 'File is too large. Please upload documents under 25MB.';
        } else if (res.status >= 500) {
          errorMsg = 'Server is currently experiencing high load. Please try again.';
        }
      }
      throw new Error(errorMsg);
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned unexpected response (${res.status}).`);
    }

    return res.json();
  }

  // System
  async getHealth() {
    return this.request<{ status: string; aiConfigured: boolean }>('/api/health');
  }

  // Auth
  async register(data: { email: string; password: string; name: string; learningGoal?: string; preferredLanguage?: string }) {
    const res = await this.request<{ token: string; user: User; preferences?: UserPreferences }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) localStorage.setItem('mf_token', res.token);
    return res;
  }

  async login(data: { email: string; password: string }) {
    const res = await this.request<{ token: string; user: User; preferences?: UserPreferences }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) localStorage.setItem('mf_token', res.token);
    return res;
  }

  async demoLogin() {
    const res = await this.request<{ token: string; user: User; preferences?: UserPreferences }>('/api/auth/demo-login', {
      method: 'POST',
    });
    if (res.token) localStorage.setItem('mf_token', res.token);
    return res;
  }

  async getMe() {
    return this.request<{ user: User; preferences?: UserPreferences; aiConfigured: boolean }>('/api/auth/me');
  }

  async logout() {
    localStorage.removeItem('mf_token');
    return this.request<{ message: string }>('/api/auth/logout', { method: 'POST' });
  }

  async updatePreferences(data: Partial<UserPreferences>) {
    return this.request<{ preferences: UserPreferences }>('/api/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateProfile(data: { name: string; avatarUrl?: string }) {
    return this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount() {
    const res = await this.request<{ message: string }>('/api/auth/account', { method: 'DELETE' });
    localStorage.removeItem('mf_token');
    return res;
  }

  // Sources
  async uploadSourceFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('mf_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/sources/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      let errorMsg = `File upload failed (${res.status})`;
      if (contentType.includes('application/json')) {
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // fallback
        }
      } else {
        if (res.status === 413) {
          errorMsg = 'Document exceeds maximum size limit (25 MB).';
        } else if (res.status === 401) {
          errorMsg = 'Your session has expired. Please sign in or click "Judge Demo" to continue.';
        } else if (res.status >= 500) {
          errorMsg = 'Server processing timed out on this file. Please ensure it is a valid, unencrypted PDF and retry.';
        }
      }
      throw new Error(errorMsg);
    }

    if (!contentType.includes('application/json')) {
      throw new Error('Server returned unexpected format. Please retry the upload.');
    }

    return res.json() as Promise<{ source: Source }>;
  }

  async importYouTube(url: string) {
    return this.request<{ source: Source }>('/api/sources/youtube', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async createManualSource(title: string, content: string) {
    return this.request<{ source: Source }>('/api/sources/manual', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  }

  async getSources() {
    return this.request<{ sources: Source[] }>('/api/sources');
  }

  async getSource(id: string) {
    return this.request<{
      source: Source;
      chunks: SourceChunk[];
      decks: FlashcardDeck[];
      quizzes: Quiz[];
      notes: StudyNote[];
    }>(`/api/sources/${id}`);
  }

  async updateSourceTitle(id: string, title: string) {
    return this.request<{ source: Source }>(`/api/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteSource(id: string) {
    return this.request<{ message: string }>(`/api/sources/${id}`, { method: 'DELETE' });
  }

  // Collections
  async getCollections() {
    return this.request<{ collections: Collection[] }>('/api/collections');
  }

  async createCollection(name: string, description?: string, color?: string, icon?: string) {
    return this.request<{ collection: Collection }>('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description, color, icon }),
    });
  }

  async getCollection(id: string) {
    return this.request<{ collection: Collection; sources: Source[] }>(`/api/collections/${id}`);
  }

  async deleteCollection(id: string) {
    return this.request<{ message: string }>(`/api/collections/${id}`, { method: 'DELETE' });
  }

  async addSourceToCollection(collectionId: string, sourceId: string) {
    return this.request<{ message: string }>(`/api/collections/${collectionId}/sources`, {
      method: 'POST',
      body: JSON.stringify({ sourceId }),
    });
  }

  // Generation
  async generateFlashcards(data: {
    sourceId?: string;
    collectionId?: string;
    count?: number;
    difficulty?: string;
    cardType?: string;
    topics?: string[];
    language?: string;
  }) {
    return this.request<{ deck: FlashcardDeck; cards: Flashcard[] }>('/api/generate/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateQuiz(data: {
    sourceId?: string;
    collectionId?: string;
    count?: number;
    difficulty?: string;
    questionTypes?: string[];
    topics?: string[];
    language?: string;
    timerSeconds?: number;
    mode?: 'practice' | 'assessment';
  }) {
    return this.request<{ quiz: Quiz; questions: QuizQuestion[] }>('/api/generate/quiz', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateNotes(data: { sourceId: string; formatType: string; language?: string }) {
    return this.request<{ note: StudyNote }>('/api/generate/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Flashcards
  async getFlashcardDecks() {
    return this.request<{ decks: FlashcardDeck[] }>('/api/flashcards/decks');
  }

  async getFlashcardDeck(id: string) {
    return this.request<{ deck: FlashcardDeck; cards: Flashcard[] }>(`/api/flashcards/decks/${id}`);
  }

  async updateDeck(id: string, data: { title?: string; description?: string }) {
    return this.request<{ deck: FlashcardDeck }>(`/api/flashcards/decks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDeck(id: string) {
    return this.request<{ message: string }>(`/api/flashcards/decks/${id}`, { method: 'DELETE' });
  }

  async addCard(deckId: string, card: { front: string; back: string; explanation?: string; sourceReference?: string; pageNumber?: number }) {
    return this.request<{ card: Flashcard }>(`/api/flashcards/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify(card),
    });
  }

  async updateCard(cardId: string, card: Partial<Flashcard>) {
    return this.request<{ card: Flashcard }>(`/api/flashcards/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(card),
    });
  }

  async deleteCard(cardId: string) {
    return this.request<{ message: string }>(`/api/flashcards/cards/${cardId}`, { method: 'DELETE' });
  }

  async reviewCard(cardId: string, outcome: 'known' | 'needs_review', reviewTimeMs?: number) {
    return this.request<{ card: Flashcard }>(`/api/flashcards/cards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ outcome, reviewTimeMs }),
    });
  }

  async getDueCards() {
    return this.request<{ dueCards: Flashcard[]; count: number }>('/api/flashcards/due');
  }

  // Quizzes
  async getQuizzes() {
    return this.request<{ quizzes: Quiz[] }>('/api/quizzes');
  }

  async getQuiz(id: string, isTaking = false) {
    return this.request<{ quiz: Quiz; questions: QuizQuestion[]; pastAttempts: QuizAttempt[] }>(
      `/api/quizzes/${id}${isTaking ? '?take=true' : ''}`
    );
  }

  async submitQuiz(quizId: string, answers: Record<string, string>, timeTakenSeconds: number) {
    return this.request<{ attempt: QuizAttempt; results: QuizResultItem[] }>(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeTakenSeconds }),
    });
  }

  // Tutor
  async getTutorConversations() {
    return this.request<{ conversations: TutorConversation[] }>('/api/tutor/conversations');
  }

  async createTutorConversation(data: { sourceId?: string; collectionId?: string; title?: string }) {
    return this.request<{ conversation: TutorConversation }>('/api/tutor/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTutorConversation(id: string) {
    return this.request<{ conversation: TutorConversation; messages: ChatMessage[]; source?: Source | null }>(
      `/api/tutor/conversations/${id}`
    );
  }

  async sendTutorMessage(conversationId: string, message: string) {
    return this.request<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
      `/api/tutor/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    );
  }

  async deleteTutorConversation(id: string) {
    return this.request<{ message: string }>(`/api/tutor/conversations/${id}`, { method: 'DELETE' });
  }

  // Notes
  async getNotes() {
    return this.request<{ notes: StudyNote[] }>('/api/notes');
  }

  async getNote(id: string) {
    return this.request<{ note: StudyNote; source?: Source | null }>(`/api/notes/${id}`);
  }

  async updateNote(id: string, data: { title?: string; content?: string }) {
    return this.request<{ note: StudyNote }>(`/api/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request<{ message: string }>(`/api/notes/${id}`, { method: 'DELETE' });
  }

  // Analytics
  async getAnalytics() {
    return this.request<AnalyticsData>('/api/analytics');
  }

  // Unified Search
  async search(query: string) {
    return this.request<{
      query: string;
      results: Array<{
        type: 'source' | 'card' | 'quiz' | 'note';
        id: string;
        title: string;
        snippet: string;
        sourceId?: string;
        deckId?: string;
      }>;
    }>(`/api/search?q=${encodeURIComponent(query)}`);
  }

  // Study Session Logger
  async logStudySession(activityType: string, durationSeconds: number, details: Record<string, unknown> = {}) {
    return this.request<{ success: boolean; loggedSeconds: number }>('/api/study/session', {
      method: 'POST',
      body: JSON.stringify({ activityType, durationSeconds, details }),
    });
  }

  // Export Study Dossier (.md)
  async exportSourceGuide(sourceId: string) {
    const res = await fetch(`/api/sources/${sourceId}/export`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('mf_token') || ''}`,
      },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  }

  // Reset Demo Data
  async resetDemoData() {
    return this.request<{ message: string }>('/api/demo/reset', { method: 'POST' });
  }
}

export const api = new ApiClient();
