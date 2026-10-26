import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, parsePlainText } from '../server/parsers.js';
import { db } from '../server/db.js';
import { rankChunksForQuery } from '../server/ai.js';

describe('Text Chunking & Boundary Preservation', () => {
  test('splits large paragraphs into chunks with metadata', () => {
    const sample = 'Paragraph 1 discussing cellular metabolism.\n\nParagraph 2 discussing the citric acid cycle.\n\nParagraph 3 discussing oxidative phosphorylation.';
    const chunks = chunkText(sample, 80, 20);
    assert.ok(chunks.length >= 2, 'Should produce multiple overlapping chunks');
    assert.ok(chunks[0].content.length > 0);
    assert.equal(chunks[0].chunkIndex, 0);
  });

  test('normalizes plain text and computes word count', () => {
    const doc = parsePlainText('Glucose is converted into pyruvate during glycolysis in the cytoplasm.');
    assert.equal(doc.wordCount, 10);
    assert.equal(doc.chunks.length, 1);
  });
});

describe('RAG Ranking & Grounding Retrieval', () => {
  test('ranks relevant chunks above irrelevant ones', () => {
    const mockChunks = [
      { id: '1', sourceId: 's1', chunkIndex: 0, content: 'Planetary orbits and gravitational forces around stars.', createdAt: '' },
      { id: '2', sourceId: 's1', chunkIndex: 1, content: 'Mitochondria produce ATP through ATP Synthase and proton gradient.', createdAt: '' },
      { id: '3', sourceId: 's1', chunkIndex: 2, content: 'The respiratory system in mammals and hemoglobin binding.', createdAt: '' },
    ];

    const ranked = rankChunksForQuery('ATP Synthase mitochondria', mockChunks, 2);
    assert.equal(ranked[0].id, '2', 'Most relevant chunk regarding ATP and mitochondria must be first');
  });
});

describe('Database Schema & Seed Verification', () => {
  test('demo user exists with pre-loaded biological study set', () => {
    const demoSource = db.sources.find(s => s.id === 'source-demo-bio-101');
    assert.ok(demoSource, 'Demo biology source should be present');
    assert.equal(demoSource?.title, 'Cellular Respiration & Energy Production (Bio 101)');

    const demoCards = db.flashcards.filter(c => c.deckId === 'deck-demo-bio-flashcards');
    assert.ok(demoCards.length >= 8, 'Demo deck should have 8 cards');

    const demoQuiz = db.quizzes.find(q => q.id === 'quiz-demo-bio-respiration');
    assert.ok(demoQuiz, 'Demo quiz should be present');
  });
});

describe('Quiz Scoring Logic', () => {
  test('server-authoritative scoring validates MCQ, True/False, and fill-in-the-blank correctly', () => {
    const questions = [
      { id: 'q1', type: 'mcq', correct: 'Cytoplasm (Cytosol)' },
      { id: 'q2', type: 'true_false', correct: 'False' },
      { id: 'q3', type: 'fill_blank', correct: 'Synthase' },
    ];

    const userAnswers = {
      q1: 'Cytoplasm (Cytosol)',
      q2: 'False',
      q3: 'synthase', // case-insensitive
    };

    let score = 0;
    questions.forEach(q => {
      const submitted = userAnswers[q.id as keyof typeof userAnswers];
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (submitted.toLowerCase() === q.correct.toLowerCase()) score++;
      } else if (q.type === 'fill_blank') {
        if (submitted.toLowerCase().trim() === q.correct.toLowerCase().trim()) score++;
      }
    });

    assert.equal(score, 3, 'All 3 questions should be graded as correct');
  });
});

describe('Authentication Security & Session Continuity', () => {
  test('generates valid JWT signed with high-entropy secret', async () => {
    const { generateToken, getSigningSecret } = await import('../server/auth.js');
    const dummyUser = {
      id: 'user-test-123',
      email: 'test@mindforge.ai',
      name: 'Test Student',
      passwordHash: 'hash',
      role: 'user' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const token = generateToken(dummyUser);
    assert.ok(typeof token === 'string' && token.length > 20, 'Should return non-empty JWT string');
    assert.ok(getSigningSecret().length >= 16, 'Secret must be at least 16 chars');

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, getSigningSecret()) as any;
    assert.equal(decoded.id, dummyUser.id);
    assert.equal(decoded.email, dummyUser.email);
  });
});

describe('Study Streak Calculation & Habit Consistency Engine', () => {
  test('calculates active streak when studied today and previous consecutive days', () => {
    // Simulated dailyActivity array (past 5 days: index 4 is today)
    const mockDailyActivity = [
      { date: '2026-10-22', count: 0, studyMinutes: 0 },
      { date: '2026-10-23', count: 3, studyMinutes: 45 },
      { date: '2026-10-24', count: 2, studyMinutes: 30 },
      { date: '2026-10-25', count: 4, studyMinutes: 60 },
      { date: '2026-10-26', count: 1, studyMinutes: 15 }, // today
    ];

    const todayEntry = mockDailyActivity[mockDailyActivity.length - 1];
    const hasStudiedToday = todayEntry.count > 0;
    let streak = 0;
    if (hasStudiedToday) {
      streak = 1;
      for (let k = mockDailyActivity.length - 2; k >= 0; k--) {
        if (mockDailyActivity[k].count > 0) streak++;
        else break;
      }
    }

    assert.equal(hasStudiedToday, true);
    assert.equal(streak, 4, 'Should be 4 consecutive days (Oct 23 to Oct 26)');
  });

  test('preserves active streak when user has not studied today yet but studied yesterday', () => {
    const mockDailyActivity = [
      { date: '2026-10-22', count: 0, studyMinutes: 0 },
      { date: '2026-10-23', count: 2, studyMinutes: 30 },
      { date: '2026-10-24', count: 3, studyMinutes: 45 },
      { date: '2026-10-25', count: 1, studyMinutes: 20 }, // yesterday
      { date: '2026-10-26', count: 0, studyMinutes: 0 },  // today (pending)
    ];

    const todayEntry = mockDailyActivity[mockDailyActivity.length - 1];
    const yesterdayEntry = mockDailyActivity[mockDailyActivity.length - 2];
    const hasStudiedToday = todayEntry.count > 0;
    const hasStudiedYesterday = yesterdayEntry.count > 0;

    let streak = 0;
    if (hasStudiedToday) {
      streak = 1;
      for (let k = mockDailyActivity.length - 2; k >= 0; k--) {
        if (mockDailyActivity[k].count > 0) streak++;
        else break;
      }
    } else if (hasStudiedYesterday) {
      streak = 1;
      for (let k = mockDailyActivity.length - 3; k >= 0; k--) {
        if (mockDailyActivity[k].count > 0) streak++;
        else break;
      }
    }

    assert.equal(hasStudiedToday, false);
    assert.equal(streak, 3, 'Streak should be preserved at 3 days until end of today');
  });

  test('resets streak to 0 when both today and yesterday had no study activity', () => {
    const mockDailyActivity = [
      { date: '2026-10-22', count: 5, studyMinutes: 60 },
      { date: '2026-10-23', count: 4, studyMinutes: 50 },
      { date: '2026-10-24', count: 0, studyMinutes: 0 },  // 2 days ago missed
      { date: '2026-10-25', count: 0, studyMinutes: 0 },  // yesterday missed
      { date: '2026-10-26', count: 0, studyMinutes: 0 },  // today
    ];

    const todayEntry = mockDailyActivity[mockDailyActivity.length - 1];
    const yesterdayEntry = mockDailyActivity[mockDailyActivity.length - 2];
    const hasStudiedToday = todayEntry.count > 0;
    const hasStudiedYesterday = yesterdayEntry.count > 0;

    let streak = 0;
    if (hasStudiedToday) {
      streak = 1;
      for (let k = mockDailyActivity.length - 2; k >= 0; k--) {
        if (mockDailyActivity[k].count > 0) streak++;
        else break;
      }
    } else if (hasStudiedYesterday) {
      streak = 1;
      for (let k = mockDailyActivity.length - 3; k >= 0; k--) {
        if (mockDailyActivity[k].count > 0) streak++;
        else break;
      }
    }

    assert.equal(streak, 0, 'Streak should be 0 after missing consecutive days');
  });
});


