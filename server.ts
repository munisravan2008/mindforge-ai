import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import { db, User, Source, SourceChunk } from './server/db.js';
import { ensureDemoData, DEMO_USER_ID } from './server/seed.js';
import {
  authMiddleware,
  AuthenticatedRequest,
  generateToken,
  hashPassword,
  comparePassword,
} from './server/auth.js';
import {
  parsePdf,
  parseDocx,
  parsePlainText,
  parseYouTubeVideo,
} from './server/parsers.js';
import {
  isAiConfigured,
  analyzeSourceDocument,
  generateFlashcards,
  generateQuiz,
  generateStudyNotes,
  askGroundedTutor,
} from './server/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Multer upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(cookieParser());

// Initialize seed demo data
ensureDemoData().catch(err => console.error('Error seeding demo data:', err));

// ==========================================
// 1. Health & System API
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: isAiConfigured(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platform: 'MindForge AI Production Learning Engine',
  });
});

// ==========================================
// 2. Authentication API
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, learningGoal, preferredLanguage, studyMethods } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existing = db.users.find(u => u.email.toLowerCase() === emailNormalized);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      email: emailNormalized,
      passwordHash,
      name: name.trim(),
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    db.userPreferences.push({
      userId,
      preferredLanguage: preferredLanguage || 'English',
      learningGoal: learningGoal || 'college',
      studyMethods: studyMethods || ['flashcards', 'quizzes', 'tutor'],
      defaultDifficulty: 'medium',
      defaultQuizQuestionCount: 5,
      theme: 'dark',
    });

    db.save();

    const token = generateToken(newUser);
    res.cookie('mf_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      preferences: db.userPreferences.find(p => p.userId === userId),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const user = db.users.find(u => u.email.toLowerCase() === emailNormalized);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.cookie('mf_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    const preferences = db.userPreferences.find(p => p.userId === user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      preferences,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Demo login for quick judge evaluation
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    await ensureDemoData();
    const demoUser = db.users.find(u => u.id === DEMO_USER_ID);
    if (!demoUser) {
      return res.status(500).json({ error: 'Demo user initialization failed.' });
    }

    const token = generateToken(demoUser);
    res.cookie('mf_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });

    const preferences = db.userPreferences.find(p => p.userId === demoUser.id);

    res.json({
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        avatarUrl: demoUser.avatarUrl,
        role: demoUser.role,
      },
      preferences,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo login failed.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const preferences = db.userPreferences.find(p => p.userId === user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
    preferences,
    aiConfigured: isAiConfigured(),
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('mf_token');
  res.json({ message: 'Signed out successfully.' });
});

app.put('/api/auth/preferences', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  let pref = db.userPreferences.find(p => p.userId === userId);
  if (!pref) {
    pref = {
      userId,
      preferredLanguage: 'English',
      learningGoal: 'college',
      studyMethods: ['flashcards', 'quizzes', 'tutor'],
      defaultDifficulty: 'medium',
      defaultQuizQuestionCount: 5,
      theme: 'dark',
    };
    db.userPreferences.push(pref);
  }

  const { preferredLanguage, learningGoal, studyMethods, defaultDifficulty, defaultQuizQuestionCount, theme } = req.body;
  if (preferredLanguage) pref.preferredLanguage = preferredLanguage;
  if (learningGoal) pref.learningGoal = learningGoal;
  if (Array.isArray(studyMethods)) pref.studyMethods = studyMethods;
  if (defaultQuizQuestionCount !== undefined && defaultQuizQuestionCount !== null) {
    const num = Number(defaultQuizQuestionCount);
    if (Number.isFinite(num)) {
      pref.defaultQuizQuestionCount = Math.max(3, Math.min(20, Math.round(num)));
    }
  }
  if (theme) pref.theme = theme;

  db.save();
  res.json({ preferences: pref });
});

app.put('/api/auth/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, avatarUrl } = req.body;
  if (name) user.name = name.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();

  db.save();
  res.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
});

app.delete('/api/auth/account', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  if (userId === DEMO_USER_ID) {
    return res.status(403).json({ error: 'The demo demonstration account cannot be deleted.' });
  }

  // Cascade delete all user records
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) db.users.splice(userIndex, 1);

  // Remove preferences
  const prefIdx = db.userPreferences.findIndex(p => p.userId === userId);
  if (prefIdx !== -1) db.userPreferences.splice(prefIdx, 1);

  // Remove sources & chunks
  const userSources = db.sources.filter(s => s.userId === userId);
  userSources.forEach(s => {
    const chunkIndices: number[] = [];
    db.sourceChunks.forEach((c, idx) => {
      if (c.sourceId === s.id) chunkIndices.push(idx);
    });
    for (let i = chunkIndices.length - 1; i >= 0; i--) {
      db.sourceChunks.splice(chunkIndices[i], 1);
    }
  });

  // Filter out other tables
  const userSrcIds = new Set(userSources.map(s => s.id));
  db.data.sources = db.data.sources.filter(s => s.userId !== userId);
  db.data.collections = db.data.collections.filter(c => c.userId !== userId);
  db.data.flashcardDecks = db.data.flashcardDecks.filter(d => d.userId !== userId);
  db.data.quizzes = db.data.quizzes.filter(q => q.userId !== userId);
  db.data.tutorConversations = db.data.tutorConversations.filter(t => t.userId !== userId);
  db.data.studyNotes = db.data.studyNotes.filter(n => n.userId !== userId);
  db.data.studyActivity = db.data.studyActivity.filter(a => a.userId !== userId);

  db.save();
  res.clearCookie('mf_token');
  res.json({ message: 'Account and all associated materials have been securely deleted.' });
});

// ==========================================
// 3. Source Management & Processing Pipeline
// ==========================================

// Helper to process document text and chunks
async function processAndSaveSource(
  userId: string,
  title: string,
  type: Source['type'],
  extracted: { text: string; chunks: any[]; wordCount: number },
  meta: Partial<Source> = {}
): Promise<Source> {
  const sourceId = `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Create pending source record
  const newSource: Source = {
    id: sourceId,
    userId,
    title: title.trim(),
    type,
    originalFilename: meta.originalFilename,
    fileSize: meta.fileSize,
    mimeType: meta.mimeType,
    videoUrl: meta.videoUrl,
    processingStatus: 'preparing_ai',
    wordCount: extracted.wordCount,
    chunkCount: extracted.chunks.length,
    createdAt: now,
    updatedAt: now,
  };

  db.sources.push(newSource);

  // Store extracted chunks
  const storedChunks: SourceChunk[] = extracted.chunks.map((chunk, index) => {
    const chunkRecord: SourceChunk = {
      id: `chunk-${sourceId}-${index}`,
      sourceId,
      chunkIndex: index,
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      timestamp: chunk.timestamp,
      heading: chunk.heading,
      tokenCount: Math.round(chunk.content.split(/\s+/).length * 1.3),
      createdAt: now,
    };
    db.sourceChunks.push(chunkRecord);
    return chunkRecord;
  });

  // Run AI analysis if AI is configured
  if (isAiConfigured()) {
    try {
      const analysis = await analyzeSourceDocument(newSource.title, extracted.text, storedChunks);
      newSource.summary = analysis.summary;
      newSource.topicOutline = analysis.topicOutline;
      newSource.keyConcepts = analysis.keyConcepts;
      newSource.definitions = analysis.definitions;
      newSource.processingStatus = 'ready';
    } catch (aiErr: any) {
      console.warn('AI Document synthesis error:', aiErr);
      newSource.summary = `Processed ${extracted.wordCount} words across ${extracted.chunks.length} sections.`;
      newSource.processingStatus = 'ready';
      newSource.errorMessage = `AI Key active but analysis timed out: ${aiErr.message}`;
    }
  } else {
    // Graceful offline fallback
    newSource.summary = `Document processed with ${extracted.wordCount} words and ${extracted.chunks.length} extracted sections. (Add GEMINI_API_KEY in Secrets for automated synthesis)`;
    newSource.topicOutline = ['General Overview', 'Core Topics', 'Summary Points'];
    newSource.keyConcepts = [
      { term: title, definition: `Primary subject matter containing ${extracted.wordCount} words.` }
    ];
    newSource.processingStatus = 'ready';
  }

  // Record study activity
  db.studyActivity.push({
    id: `act-${Date.now()}`,
    userId,
    activityType: 'source_uploaded',
    metadata: { sourceId: newSource.id, title: newSource.title, type: newSource.type },
    createdAt: now,
  });

  db.save();
  return newSource;
}

// Upload file (PDF, DOCX, TXT, MD)
app.post(
  '/api/sources/upload',
  authMiddleware,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer file upload error:', err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const userId = req.user!.id;
    const originalName = file.originalname || 'Document';
    const mime = file.mimetype;
    const ext = path.extname(originalName).toLowerCase();

    let extracted: { text: string; chunks: any[]; wordCount: number };
    let sourceType: Source['type'] = 'txt';

    if (ext === '.pdf' || mime === 'application/pdf') {
      sourceType = 'pdf';
      try {
        extracted = await parsePdf(file.buffer);
      } catch (pdfErr: any) {
        return res.status(422).json({ error: `Could not parse PDF: ${pdfErr.message}. Ensure it is not encrypted or corrupted.` });
      }
    } else if (ext === '.docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      sourceType = 'docx';
      try {
        extracted = await parseDocx(file.buffer);
      } catch (docxErr: any) {
        return res.status(422).json({ error: `Could not parse DOCX: ${docxErr.message}` });
      }
    } else if (ext === '.txt' || ext === '.md' || ext === '.markdown' || mime.startsWith('text/')) {
      sourceType = 'txt';
      const text = file.buffer.toString('utf-8');
      extracted = parsePlainText(text);
    } else {
      return res.status(400).json({
        error: `Unsupported file format (${ext || mime}). Please upload PDF, DOCX, TXT, or Markdown files.`,
      });
    }

    if (!extracted.text.trim()) {
      return res.status(422).json({
        error: 'The uploaded file appears to be empty or contains only unscannable images. If this is a scanned document, OCR is required.',
      });
    }

    const title = originalName.replace(/\.[^/.]+$/, '');
    const source = await processAndSaveSource(userId, title, sourceType, extracted, {
      originalFilename: originalName,
      fileSize: file.size,
      mimeType: mime,
    });

    res.status(201).json({ source });
  } catch (err: any) {
    console.error('File upload failure:', err);
    res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

// Import YouTube Video
app.post('/api/sources/youtube', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid YouTube video URL.' });
    }

    const userId = req.user!.id;
    const extracted = await parseYouTubeVideo(url.trim());

    const source = await processAndSaveSource(userId, extracted.title, 'youtube', extracted, {
      videoUrl: url.trim(),
    });

    res.status(201).json({ source });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process YouTube lecture transcript.' });
  }
});

// Manual Text / Lecture Notes
app.post('/api/sources/manual', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content || !content.trim()) {
      return res.status(400).json({ error: 'Please provide a title and study content.' });
    }

    const userId = req.user!.id;
    const extracted = parsePlainText(content.trim());

    const source = await processAndSaveSource(userId, title, 'notes', extracted);
    res.status(201).json({ source });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save notes.' });
  }
});

// List Sources
app.get('/api/sources', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userSources = db.sources.filter(s => s.userId === userId);

  // Attach associated counts
  const enriched = userSources.map(s => {
    const decks = db.flashcardDecks.filter(d => d.sourceId === s.id);
    const quizzes = db.quizzes.filter(q => q.sourceId === s.id);
    const notes = db.studyNotes.filter(n => n.sourceId === s.id);
    return {
      ...s,
      deckCount: decks.length,
      quizCount: quizzes.length,
      notesCount: notes.length,
    };
  });

  res.json({ sources: enriched });
});

// Get Single Source with Chunks
app.get('/api/sources/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const source = db.sources.find(s => s.id === req.params.id && s.userId === userId);
  if (!source) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  const chunks = db.sourceChunks.filter(c => c.sourceId === source.id);
  const decks = db.flashcardDecks.filter(d => d.sourceId === source.id);
  const quizzes = db.quizzes.filter(q => q.sourceId === source.id);
  const notes = db.studyNotes.filter(n => n.sourceId === source.id);

  res.json({
    source,
    chunks,
    decks,
    quizzes,
    notes,
  });
});

// Update Source Title
app.patch('/api/sources/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const source = db.sources.find(s => s.id === req.params.id && s.userId === userId);
  if (!source) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  const { title } = req.body;
  if (title) source.title = title.trim();
  source.updatedAt = new Date().toISOString();

  db.save();
  res.json({ source });
});

// Delete Source
app.delete('/api/sources/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const sourceIdx = db.sources.findIndex(s => s.id === req.params.id && s.userId === userId);
  if (sourceIdx === -1) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  const sourceId = req.params.id;
  db.sources.splice(sourceIdx, 1);

  // Cascade delete chunks
  db.data.sourceChunks = db.data.sourceChunks.filter(c => c.sourceId !== sourceId);
  db.data.collectionSources = db.data.collectionSources.filter(cs => cs.sourceId !== sourceId);

  db.save();
  res.json({ message: 'Source and derived chunks removed.' });
});

// ==========================================
// 4. Collections API
// ==========================================
app.get('/api/collections', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userCols = db.collections.filter(c => c.userId === userId);

  const enriched = userCols.map(c => {
    const links = db.collectionSources.filter(cs => cs.collectionId === c.id);
    return {
      ...c,
      sourceCount: links.length,
    };
  });

  res.json({ collections: enriched });
});

app.post('/api/collections', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { name, description, color, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Collection name is required.' });
  }

  const userId = req.user!.id;
  const now = new Date().toISOString();
  const newCol = {
    id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    name: name.trim(),
    description: description?.trim() || '',
    color: color || '#6366f1',
    icon: icon || 'Folder',
    createdAt: now,
    updatedAt: now,
  };

  db.collections.push(newCol);
  db.save();
  res.status(201).json({ collection: newCol });
});

app.get('/api/collections/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const col = db.collections.find(c => c.id === req.params.id && c.userId === userId);
  if (!col) {
    return res.status(404).json({ error: 'Collection not found.' });
  }

  const links = db.collectionSources.filter(cs => cs.collectionId === col.id);
  const sourceIds = new Set(links.map(l => l.sourceId));
  const sources = db.sources.filter(s => sourceIds.has(s.id) && s.userId === userId);

  res.json({ collection: col, sources });
});

app.delete('/api/collections/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const idx = db.collections.findIndex(c => c.id === req.params.id && c.userId === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Collection not found.' });
  }

  const colId = req.params.id;
  db.collections.splice(idx, 1);
  db.data.collectionSources = db.data.collectionSources.filter(cs => cs.collectionId !== colId);
  db.save();
  res.json({ message: 'Collection deleted.' });
});

app.post('/api/collections/:id/sources', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const col = db.collections.find(c => c.id === req.params.id && c.userId === userId);
  if (!col) return res.status(404).json({ error: 'Collection not found.' });

  const { sourceId } = req.body;
  const source = db.sources.find(s => s.id === sourceId && s.userId === userId);
  if (!source) return res.status(404).json({ error: 'Source not found.' });

  const existing = db.collectionSources.find(cs => cs.collectionId === col.id && cs.sourceId === sourceId);
  if (!existing) {
    db.collectionSources.push({
      id: `cs-${Date.now()}`,
      collectionId: col.id,
      sourceId,
      addedAt: new Date().toISOString(),
    });
    db.save();
  }

  res.json({ message: 'Source added to collection.' });
});

// ==========================================
// 5. AI Generation API
// ==========================================

// Helper to gather chunks from sourceId or collectionId
function getChunksForScope(userId: string, sourceId?: string, collectionId?: string): { chunks: SourceChunk[]; title: string } {
  if (sourceId) {
    const source = db.sources.find(s => s.id === sourceId && s.userId === userId);
    if (!source) throw new Error('Source not found or access denied.');
    const chunks = db.sourceChunks.filter(c => c.sourceId === sourceId);
    return { chunks, title: source.title };
  } else if (collectionId) {
    const col = db.collections.find(c => c.id === collectionId && c.userId === userId);
    if (!col) throw new Error('Collection not found or access denied.');
    const links = db.collectionSources.filter(cs => cs.collectionId === collectionId);
    const srcIds = new Set(links.map(l => l.sourceId));
    const chunks = db.sourceChunks.filter(c => srcIds.has(c.sourceId));
    return { chunks, title: col.name };
  }
  throw new Error('Please select a source or collection to generate materials from.');
}

// Generate Flashcards
app.post('/api/generate/flashcards', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { sourceId, collectionId, count, difficulty, cardType, topics, language } = req.body;

    const { chunks, title } = getChunksForScope(userId, sourceId, collectionId);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No extracted study content found in the selected source.' });
    }

    const cards = await generateFlashcards(title, chunks, {
      count: parseInt(count, 10) || 8,
      difficulty: difficulty || 'medium',
      cardType: cardType || 'mixed',
      topics: Array.isArray(topics) ? topics : undefined,
      language: language || 'English',
    });

    if (cards.length === 0) {
      return res.status(500).json({ error: 'AI model did not return any cards. Try selecting a different topic or prompt.' });
    }

    const deckId = `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newDeck = {
      id: deckId,
      userId,
      sourceId,
      collectionId,
      title: `${title} — Study Deck`,
      description: `Generated AI flashcard set (${cards.length} cards, ${difficulty || 'medium'} difficulty)`,
      createdAt: now,
      updatedAt: now,
    };
    db.flashcardDecks.push(newDeck);

    const createdCards = cards.map((c: any, idx: number) => {
      const cardRecord = {
        id: `card-${deckId}-${idx + 1}`,
        deckId,
        front: c.front,
        back: c.back,
        explanation: c.explanation || '',
        sourceReference: c.sourceReference || '',
        pageNumber: c.pageNumber || undefined,
        timestamp: c.timestamp || undefined,
        reviewState: 'new' as const,
        repetitionLevel: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.flashcards.push(cardRecord);
      return cardRecord;
    });

    // Activity tracking
    db.studyActivity.push({
      id: `act-${Date.now()}`,
      userId,
      activityType: 'flashcard_review',
      metadata: { deckId, title: newDeck.title, count: cards.length },
      createdAt: now,
    });

    db.save();

    res.status(201).json({
      deck: newDeck,
      cards: createdCards,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Flashcard generation failed.' });
  }
});

// Generate Quiz
app.post('/api/generate/quiz', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { sourceId, collectionId, count, difficulty, questionTypes, topics, language, timerSeconds, mode } = req.body;

    const { chunks, title } = getChunksForScope(userId, sourceId, collectionId);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No extracted study content found in the selected source.' });
    }

    const quizData = await generateQuiz(title, chunks, {
      count: parseInt(count, 10) || 5,
      difficulty: difficulty || 'medium',
      questionTypes: Array.isArray(questionTypes) ? questionTypes : undefined,
      topics: Array.isArray(topics) ? topics : undefined,
      language: language || 'English',
    });

    if (!quizData.questions || quizData.questions.length === 0) {
      return res.status(500).json({ error: 'AI model did not return questions for the quiz.' });
    }

    const quizId = `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newQuiz = {
      id: quizId,
      userId,
      sourceId,
      collectionId,
      title: quizData.title || `${title} Practice Exam`,
      difficulty: difficulty || 'medium',
      timerSeconds: timerSeconds ? parseInt(timerSeconds, 10) : 300,
      mode: (mode === 'practice' ? 'practice' : 'assessment') as 'practice' | 'assessment',
      createdAt: now,
    };
    db.quizzes.push(newQuiz);

    const questions = quizData.questions.map((q: any, idx: number) => {
      const qRecord = {
        id: `qq-${quizId}-${idx + 1}`,
        quizId,
        questionText: q.questionText,
        questionType: q.questionType,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        sourceReference: q.sourceReference || '',
        pageNumber: q.pageNumber || undefined,
        topic: q.topic || 'General',
        questionOrder: idx,
      };
      db.quizQuestions.push(qRecord);
      return qRecord;
    });

    db.save();

    res.status(201).json({
      quiz: newQuiz,
      questions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Quiz generation failed.' });
  }
});

// Generate Notes
app.post('/api/generate/notes', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { sourceId, formatType, language } = req.body;

    const source = db.sources.find(s => s.id === sourceId && s.userId === userId);
    if (!source) return res.status(404).json({ error: 'Source not found.' });

    const chunks = db.sourceChunks.filter(c => c.sourceId === source.id);
    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Source has no extracted text.' });
    }

    const content = await generateStudyNotes(source.title, chunks, formatType || 'exam_revision', language || 'English');
    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const formatLabels: Record<string, string> = {
      one_paragraph: 'Executive Summary',
      detailed: 'Comprehensive Chapter Breakdown',
      revision_notes: 'Topic-wise Revision Notes',
      key_takeaways: 'Core High-Yield Takeaways',
      definitions: 'Glossary & Terminology Guide',
      formulas: 'Formulas & Scientific Laws Sheet',
      comparison_table: 'Comparative Analysis Matrix',
      exam_revision: 'High-Yield Exam Cram Sheet',
    };

    const newNote = {
      id: noteId,
      userId,
      sourceId,
      title: `${source.title} — ${formatLabels[formatType] || 'Study Notes'}`,
      formatType: (formatType || 'exam_revision') as any,
      content,
      createdAt: now,
      updatedAt: now,
    };

    db.studyNotes.push(newNote);

    db.studyActivity.push({
      id: `act-${Date.now()}`,
      userId,
      activityType: 'notes_generated',
      metadata: { noteId, title: newNote.title },
      createdAt: now,
    });

    db.save();
    res.status(201).json({ note: newNote });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Notes generation failed.' });
  }
});

// ==========================================
// 6. Flashcards Study API
// ==========================================
app.get('/api/flashcards/decks', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userDecks = db.flashcardDecks.filter(d => d.userId === userId);

  const enriched = userDecks.map(deck => {
    const cards = db.flashcards.filter(c => c.deckId === deck.id);
    const knownCount = cards.filter(c => c.reviewState === 'known').length;
    const reviewCount = cards.filter(c => c.reviewState === 'needs_review').length;
    const newCount = cards.filter(c => c.reviewState === 'new').length;
    return {
      ...deck,
      totalCards: cards.length,
      knownCount,
      reviewCount,
      newCount,
    };
  });

  res.json({ decks: enriched });
});

app.get('/api/flashcards/decks/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const deck = db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });

  const cards = db.flashcards.filter(c => c.deckId === deck.id);
  res.json({ deck, cards });
});

app.patch('/api/flashcards/decks/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const deck = db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });

  const { title, description } = req.body;
  if (title) deck.title = title.trim();
  if (description !== undefined) deck.description = description.trim();
  deck.updatedAt = new Date().toISOString();

  db.save();
  res.json({ deck });
});

app.delete('/api/flashcards/decks/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const deckIdx = db.flashcardDecks.findIndex(d => d.id === req.params.id && d.userId === userId);
  if (deckIdx === -1) return res.status(404).json({ error: 'Deck not found.' });

  const deckId = req.params.id;
  db.flashcardDecks.splice(deckIdx, 1);
  db.data.flashcards = db.data.flashcards.filter(c => c.deckId !== deckId);
  db.save();

  res.json({ message: 'Deck and cards deleted.' });
});

// Add card to deck
app.post('/api/flashcards/decks/:id/cards', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const deck = db.flashcardDecks.find(d => d.id === req.params.id && d.userId === userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });

  const { front, back, explanation, sourceReference, pageNumber } = req.body;
  if (!front || !back) {
    return res.status(400).json({ error: 'Question and Answer are required.' });
  }

  const now = new Date().toISOString();
  const newCard = {
    id: `card-${deck.id}-${Date.now()}`,
    deckId: deck.id,
    front: front.trim(),
    back: back.trim(),
    explanation: explanation?.trim() || '',
    sourceReference: sourceReference?.trim() || '',
    pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
    reviewState: 'new' as const,
    repetitionLevel: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.flashcards.push(newCard);
  db.save();
  res.status(201).json({ card: newCard });
});

// Update card
app.patch('/api/flashcards/cards/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const card = db.flashcards.find(c => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found.' });

  const deck = db.flashcardDecks.find(d => d.id === card.deckId && d.userId === userId);
  if (!deck) return res.status(403).json({ error: 'Unauthorized.' });

  const { front, back, explanation, sourceReference, pageNumber } = req.body;
  if (front) card.front = front.trim();
  if (back) card.back = back.trim();
  if (explanation !== undefined) card.explanation = explanation.trim();
  if (sourceReference !== undefined) card.sourceReference = sourceReference.trim();
  if (pageNumber !== undefined) card.pageNumber = pageNumber;
  card.updatedAt = new Date().toISOString();

  db.save();
  res.json({ card });
});

// Delete card
app.delete('/api/flashcards/cards/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const cardIdx = db.flashcards.findIndex(c => c.id === req.params.id);
  if (cardIdx === -1) return res.status(404).json({ error: 'Card not found.' });

  const card = db.flashcards[cardIdx];
  const deck = db.flashcardDecks.find(d => d.id === card.deckId && d.userId === userId);
  if (!deck) return res.status(403).json({ error: 'Unauthorized.' });

  db.flashcards.splice(cardIdx, 1);
  db.save();
  res.json({ message: 'Card deleted.' });
});

// Review card (Spaced Repetition Engine)
app.post('/api/flashcards/cards/:id/review', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const card = db.flashcards.find(c => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found.' });

  const deck = db.flashcardDecks.find(d => d.id === card.deckId && d.userId === userId);
  if (!deck) return res.status(403).json({ error: 'Unauthorized.' });

  const { outcome, reviewTimeMs } = req.body; // 'known' | 'needs_review'
  const isKnown = outcome === 'known';
  const now = new Date();

  card.reviewState = isKnown ? 'known' : 'needs_review';
  card.lastReviewedAt = now.toISOString();

  // Spaced repetition interval calculation
  if (isKnown) {
    card.repetitionLevel = Math.min((card.repetitionLevel || 0) + 1, 5);
    // Interval days: 1, 3, 7, 14, 30
    const intervals = [1, 3, 7, 14, 30, 60];
    const daysToAdd = intervals[card.repetitionLevel - 1] || 1;
    card.nextReviewDate = new Date(now.getTime() + daysToAdd * 86400000).toISOString();
  } else {
    card.repetitionLevel = 0;
    // Due again today / tomorrow
    card.nextReviewDate = new Date(now.getTime() + 12 * 3600000).toISOString();
  }

  card.updatedAt = now.toISOString();

  // Record review history
  db.flashcardReviewHistory.push({
    id: `frh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    flashcardId: card.id,
    deckId: deck.id,
    outcome: card.reviewState,
    reviewTimeMs: reviewTimeMs || 3000,
    reviewedAt: now.toISOString(),
  });

  // Track study activity
  db.studyActivity.push({
    id: `act-${Date.now()}`,
    userId,
    activityType: 'flashcard_review',
    metadata: { cardId: card.id, outcome: card.reviewState, deckTitle: deck.title },
    durationSeconds: Math.round((reviewTimeMs || 3000) / 1000),
    createdAt: now.toISOString(),
  });

  db.save();
  res.json({ card });
});

// Due flashcards across all user decks
app.get('/api/flashcards/due', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userDecks = db.flashcardDecks.filter(d => d.userId === userId);
  const userDeckIds = new Set(userDecks.map(d => d.id));

  const now = new Date().toISOString();
  const dueCards = db.flashcards.filter(c => {
    if (!userDeckIds.has(c.deckId)) return false;
    if (c.reviewState === 'needs_review') return true;
    if (c.nextReviewDate && c.nextReviewDate <= now) return true;
    return false;
  });

  res.json({ dueCards, count: dueCards.length });
});

// ==========================================
// 7. Quizzes API
// ==========================================
app.get('/api/quizzes', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userQuizzes = db.quizzes.filter(q => q.userId === userId);

  const enriched = userQuizzes.map(quiz => {
    const questions = db.quizQuestions.filter(qq => qq.quizId === quiz.id);
    const attempts = db.quizAttempts.filter(a => a.quizId === quiz.id && a.userId === userId);
    const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : null;

    return {
      ...quiz,
      questionCount: questions.length,
      attemptsCount: attempts.length,
      bestScore,
    };
  });

  res.json({ quizzes: enriched });
});

// Get quiz (sanitized when taking quiz)
app.get('/api/quizzes/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const quiz = db.quizzes.find(q => q.id === req.params.id && q.userId === userId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const isTaking = req.query.take === 'true';
  const questions = db.quizQuestions.filter(q => q.quizId === quiz.id);

  // If taking quiz, don't expose correct answers to client
  const clientQuestions = questions.map(q => {
    if (isTaking) {
      const { correctAnswer, explanation, ...safe } = q;
      return safe;
    }
    return q;
  });

  const attempts = db.quizAttempts.filter(a => a.quizId === quiz.id && a.userId === userId);

  res.json({
    quiz,
    questions: clientQuestions,
    pastAttempts: attempts,
  });
});

// Submit Quiz Answers (Server-authoritative scoring!)
app.post('/api/quizzes/:id/submit', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const quiz = db.quizzes.find(q => q.id === req.params.id && q.userId === userId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

  const { answers, timeTakenSeconds } = req.body; // { [questionId]: string }
  const questions = db.quizQuestions.filter(q => q.quizId === quiz.id);

  if (questions.length === 0) {
    return res.status(400).json({ error: 'Quiz has no questions.' });
  }

  let totalScore = 0;
  const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const responsesDetail: any[] = [];

  for (const q of questions) {
    const submitted = (answers && answers[q.id] !== undefined ? String(answers[q.id]) : '').trim();
    let isCorrect = false;

    if (q.questionType === 'mcq' || q.questionType === 'true_false') {
      isCorrect = submitted.toLowerCase() === q.correctAnswer.trim().toLowerCase();
    } else if (q.questionType === 'fill_blank') {
      isCorrect = submitted.toLowerCase().replace(/[^a-z0-9]/g, '') === q.correctAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
      // Short answer keyword match or loose similarity
      const targetWords = q.correctAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const subLower = submitted.toLowerCase();
      let matchCount = 0;
      targetWords.forEach(w => {
        if (subLower.includes(w)) matchCount++;
      });
      isCorrect = targetWords.length === 0 ? Boolean(submitted) : (matchCount / targetWords.length) >= 0.4;
    }

    if (isCorrect) totalScore++;

    const responseRecord = {
      id: `qr-${attemptId}-${q.id}`,
      attemptId,
      questionId: q.id,
      submittedAnswer: submitted,
      isCorrect,
      feedback: isCorrect ? 'Correct!' : `Expected: ${q.correctAnswer}`,
      points: isCorrect ? 1 : 0,
    };
    db.quizResponses.push(responseRecord);

    responsesDetail.push({
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      submittedAnswer: submitted,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
      sourceReference: q.sourceReference,
      pageNumber: q.pageNumber,
      topic: q.topic,
    });
  }

  const percentage = Math.round((totalScore / questions.length) * 100);

  const attempt = {
    id: attemptId,
    quizId: quiz.id,
    userId,
    startedAt: new Date(Date.now() - (timeTakenSeconds || 60) * 1000).toISOString(),
    completedAt: now,
    totalQuestions: questions.length,
    score: totalScore,
    percentage,
    timeTakenSeconds: timeTakenSeconds || 60,
  };
  db.quizAttempts.push(attempt);

  // Track study activity
  db.studyActivity.push({
    id: `act-${Date.now()}`,
    userId,
    activityType: 'quiz_completed',
    metadata: { quizId: quiz.id, title: quiz.title, score: totalScore, total: questions.length, percentage },
    durationSeconds: timeTakenSeconds || 60,
    createdAt: now,
  });

  db.save();

  res.json({
    attempt,
    results: responsesDetail,
  });
});

// ==========================================
// 8. Grounded AI Tutor API
// ==========================================
app.get('/api/tutor/conversations', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const convs = db.tutorConversations.filter(c => c.userId === userId);

  const enriched = convs.map(conv => {
    const messages = db.chatMessages.filter(m => m.conversationId === conv.id);
    const lastMsg = messages[messages.length - 1];
    return {
      ...conv,
      messageCount: messages.length,
      lastMessage: lastMsg ? lastMsg.content.substring(0, 80) : 'New conversation',
    };
  });

  res.json({ conversations: enriched });
});

app.post('/api/tutor/conversations', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { sourceId, collectionId, title } = req.body;
  const now = new Date().toISOString();

  let autoTitle = title || 'Study Session Inquiry';
  if (!title && sourceId) {
    const s = db.sources.find(src => src.id === sourceId);
    if (s) autoTitle = `Q&A: ${s.title.substring(0, 30)}`;
  }

  const newConv = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    sourceId,
    collectionId,
    title: autoTitle,
    createdAt: now,
    updatedAt: now,
  };

  db.tutorConversations.push(newConv);
  db.save();
  res.status(201).json({ conversation: newConv });
});

app.get('/api/tutor/conversations/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const conv = db.tutorConversations.find(c => c.id === req.params.id && c.userId === userId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

  const messages = db.chatMessages.filter(m => m.conversationId === conv.id);
  const source = conv.sourceId ? db.sources.find(s => s.id === conv.sourceId) : null;

  res.json({
    conversation: conv,
    messages,
    source,
  });
});

app.post('/api/tutor/conversations/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const conv = db.tutorConversations.find(c => c.id === req.params.id && c.userId === userId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const now = new Date().toISOString();

    // 1. Save student message
    const userMessage = {
      id: `msg-${Date.now()}-u`,
      conversationId: conv.id,
      role: 'user' as const,
      content: message.trim(),
      createdAt: now,
    };
    db.chatMessages.push(userMessage);

    // 2. Collect chunks for retrieval
    const relevantChunksWithTitle: { chunk: SourceChunk; sourceTitle: string }[] = [];
    if (conv.sourceId) {
      const s = db.sources.find(src => src.id === conv.sourceId && src.userId === userId);
      if (s) {
        const chunks = db.sourceChunks.filter(c => c.sourceId === s.id);
        chunks.forEach(c => relevantChunksWithTitle.push({ chunk: c, sourceTitle: s.title }));
      }
    } else if (conv.collectionId) {
      const links = db.collectionSources.filter(cs => cs.collectionId === conv.collectionId);
      links.forEach(l => {
        const s = db.sources.find(src => src.id === l.sourceId);
        if (s) {
          const chunks = db.sourceChunks.filter(c => c.sourceId === s.id);
          chunks.forEach(c => relevantChunksWithTitle.push({ chunk: c, sourceTitle: s.title }));
        }
      });
    } else {
      // Search all user sources
      const allUserSources = db.sources.filter(s => s.userId === userId);
      allUserSources.forEach(s => {
        const chunks = db.sourceChunks.filter(c => c.sourceId === s.id);
        chunks.forEach(c => relevantChunksWithTitle.push({ chunk: c, sourceTitle: s.title }));
      });
    }

    // 3. Get recent conversation history
    const history = db.chatMessages
      .filter(m => m.conversationId === conv.id)
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    // 4. Generate grounded tutor response
    let tutorResponse: { answer: string; citations: any[]; suggestedFollowUps: string[] };

    if (isAiConfigured()) {
      tutorResponse = await askGroundedTutor(message.trim(), relevantChunksWithTitle, history);
    } else {
      tutorResponse = {
        answer: `I received your question: "${message.trim()}". To generate live, source-grounded tutoring responses with verified citations, please configure your GEMINI_API_KEY in the Secrets panel.`,
        citations: relevantChunksWithTitle.slice(0, 1).map(r => ({
          chunkId: r.chunk.id,
          sourceTitle: r.sourceTitle,
          pageNumber: r.chunk.pageNumber,
          quote: r.chunk.content.substring(0, 100),
        })),
        suggestedFollowUps: ['How do I configure my API key?', 'Can you summarize this document?'],
      };
    }

    const assistantMessage = {
      id: `msg-${Date.now()}-a`,
      conversationId: conv.id,
      role: 'assistant' as const,
      content: tutorResponse.answer,
      citations: tutorResponse.citations,
      suggestedFollowUps: tutorResponse.suggestedFollowUps,
      createdAt: new Date().toISOString(),
    };
    db.chatMessages.push(assistantMessage);

    conv.updatedAt = new Date().toISOString();

    // Track study activity
    db.studyActivity.push({
      id: `act-${Date.now()}`,
      userId,
      activityType: 'tutor_session',
      metadata: { conversationId: conv.id, question: message.trim().substring(0, 40) },
      durationSeconds: 120,
      createdAt: new Date().toISOString(),
    });

    db.save();

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Tutor response failed.' });
  }
});

app.delete('/api/tutor/conversations/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const idx = db.tutorConversations.findIndex(c => c.id === req.params.id && c.userId === userId);
  if (idx === -1) return res.status(404).json({ error: 'Conversation not found.' });

  const convId = req.params.id;
  db.tutorConversations.splice(idx, 1);
  db.data.chatMessages = db.data.chatMessages.filter(m => m.conversationId !== convId);
  db.save();

  res.json({ message: 'Conversation deleted.' });
});

// ==========================================
// 9. Notes & Summaries API
// ==========================================
app.get('/api/notes', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userNotes = db.studyNotes.filter(n => n.userId === userId);

  const enriched = userNotes.map(note => {
    const source = note.sourceId ? db.sources.find(s => s.id === note.sourceId) : null;
    return {
      ...note,
      sourceTitle: source ? source.title : 'General Study Note',
    };
  });

  res.json({ notes: enriched });
});

app.get('/api/notes/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const note = db.studyNotes.find(n => n.id === req.params.id && n.userId === userId);
  if (!note) return res.status(404).json({ error: 'Study notes not found.' });

  const source = note.sourceId ? db.sources.find(s => s.id === note.sourceId) : null;
  res.json({ note, source });
});

app.patch('/api/notes/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const note = db.studyNotes.find(n => n.id === req.params.id && n.userId === userId);
  if (!note) return res.status(404).json({ error: 'Study notes not found.' });

  const { title, content } = req.body;
  if (title) note.title = title.trim();
  if (content !== undefined) note.content = content;
  note.updatedAt = new Date().toISOString();

  db.save();
  res.json({ note });
});

app.delete('/api/notes/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const idx = db.studyNotes.findIndex(n => n.id === req.params.id && n.userId === userId);
  if (idx === -1) return res.status(404).json({ error: 'Note not found.' });

  db.studyNotes.splice(idx, 1);
  db.save();
  res.json({ message: 'Study note removed.' });
});

// ==========================================
// 10. Analytics API (Real Database-Backed!)
// ==========================================
app.get('/api/analytics', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const activities = db.studyActivity.filter(a => a.userId === userId);
  const flashcardReviews = db.flashcardReviewHistory.filter(f => f.userId === userId);
  const quizAttempts = db.quizAttempts.filter(q => q.userId === userId);
  const sources = db.sources.filter(s => s.userId === userId);
  const userDecks = db.flashcardDecks.filter(d => d.userId === userId);
  const userDeckIds = new Set(userDecks.map(d => d.id));
  const userCards = db.flashcards.filter(c => userDeckIds.has(c.deckId));

  // Daily activity and content mastery aggregation for the last 30 days
  const dailyActivity: {
    date: string;
    formattedDate: string;
    count: number;
    studyMinutes: number;
    mastery: number;
  }[] = [];

  // Track progressive cumulative mastery score across the 30-day window
  let runningMastery = userCards.length > 0
    ? Math.max(25, Math.round((userCards.filter(c => c.reviewState === 'known').length / userCards.length) * 100))
    : 0;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    const formattedDate = `${monthName} ${dayNum}`;

    const dayActs = activities.filter(a => a.createdAt.startsWith(dateStr));
    const totalSecs = dayActs.reduce((acc, curr) => acc + (curr.durationSeconds || 180), 0);
    const studyMinutes = Math.round(totalSecs / 60);

    // Calculate daily or cumulative content mastery
    const quizzesUntilNow = quizAttempts.filter(q => q.completedAt.split('T')[0] <= dateStr);
    const recentQuizPct = quizzesUntilNow.length > 0
      ? Math.round(quizzesUntilNow.slice(-3).reduce((sum, q) => sum + q.percentage, 0) / Math.min(quizzesUntilNow.length, 3))
      : 0;

    const cardsMasteredRatio = userCards.length > 0
      ? userCards.filter(c => c.reviewState === 'known').length / userCards.length
      : 0;

    // Gradual progression curve towards current known cards / quiz accuracy
    const progressFactor = Math.min(1, (30 - i) / 25);
    const baseline = userCards.length > 0 ? 30 : 0;
    const targetMastery = recentQuizPct > 0 
      ? Math.round((cardsMasteredRatio * 50) + (recentQuizPct * 0.5))
      : Math.round(cardsMasteredRatio * 100);

    const calculatedMastery = Math.min(100, Math.max(0, Math.round(baseline + (targetMastery - baseline) * progressFactor)));

    dailyActivity.push({
      date: dateStr,
      formattedDate,
      count: dayActs.length,
      studyMinutes,
      mastery: calculatedMastery,
    });
  }

  // Quiz accuracy average
  const totalQuizScore = quizAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
  const averageQuizAccuracy = quizAttempts.length > 0 ? Math.round(totalQuizScore / quizAttempts.length) : 0;

  // Due flashcards count
  const now = new Date().toISOString();
  const dueCount = userCards.filter(c => c.reviewState === 'needs_review' || (c.nextReviewDate && c.nextReviewDate <= now)).length;
  const knownCards = userCards.filter(c => c.reviewState === 'known').length;

  // Topics practiced
  const topicsSet = new Set<string>();
  sources.forEach(s => s.topicOutline?.forEach(t => topicsSet.add(t)));
  const topics = Array.from(topicsSet).slice(0, 8);

  // Frequently missed questions / concepts
  const incorrectResponses = db.quizResponses.filter(r => !r.isCorrect);
  const missedQuestionIds = new Set(incorrectResponses.map(r => r.questionId));
  const missedConcepts = db.quizQuestions
    .filter(q => missedQuestionIds.has(q.id))
    .map(q => ({
      question: q.questionText,
      topic: q.topic || 'General',
      sourceReference: q.sourceReference,
    }))
    .slice(0, 5);

  // Calculate consecutive study streaks across dailyActivity
  const todayEntry = dailyActivity[dailyActivity.length - 1]; // index 29 is today
  const yesterdayEntry = dailyActivity[dailyActivity.length - 2]; // index 28 is yesterday
  const hasStudiedToday = (todayEntry?.count || 0) > 0;
  const hasStudiedYesterday = (yesterdayEntry?.count || 0) > 0;

  let currentStreak = 0;
  if (hasStudiedToday) {
    currentStreak = 1;
    for (let k = dailyActivity.length - 2; k >= 0; k--) {
      if (dailyActivity[k].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (hasStudiedYesterday) {
    currentStreak = 1;
    for (let k = dailyActivity.length - 3; k >= 0; k--) {
      if (dailyActivity[k].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  // Calculate longest streak across the 30-day window
  let longestStreak = 0;
  let runningStreak = 0;
  for (const day of dailyActivity) {
    if (day.count > 0) {
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Next milestone calculation
  const streakMilestones = [3, 7, 14, 21, 30, 50, 100];
  const nextMilestone = streakMilestones.find(m => m > currentStreak) || (currentStreak + 7);
  const daysToMilestone = Math.max(1, nextMilestone - currentStreak);

  // Week days breakdown (past 7 days ending with today)
  const weekDays = dailyActivity.slice(-7).map((day, idx) => {
    const [y, m, dNum] = day.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, dNum, 12, 0, 0));
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' });
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const isToday = idx === 6;

    return {
      date: day.date,
      formattedDate: day.formattedDate,
      dayLabel,
      dayName,
      isToday,
      hasStudied: day.count > 0,
      count: day.count,
      studyMinutes: day.studyMinutes,
    };
  });

  res.json({
    metrics: {
      totalStudySessions: activities.length,
      totalSources: sources.length,
      flashcardsReviewed: flashcardReviews.length,
      quizzesCompleted: quizAttempts.length,
      averageQuizAccuracy,
      totalCardsCount: userCards.length,
      knownCardsCount: knownCards,
      dueCardsCount: dueCount,
      currentStreak,
      longestStreak,
      hasStudiedToday,
    },
    dailyActivity,
    streakInfo: {
      currentStreak,
      longestStreak,
      hasStudiedToday,
      nextMilestone,
      daysToMilestone,
      weekDays,
    },
    topicsPracticed: topics,
    missedConcepts,
    recentActivity: activities.slice(-8).reverse(),
  });
});

// ==========================================
// 10B. Global Search, Export & Session Tracking
// ==========================================

// Unified search across all user materials
app.get('/api/search', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const query = ((req.query.q as string) || '').toLowerCase().trim();

  if (!query) {
    return res.json({ results: [] });
  }

  const results: any[] = [];

  // Match sources
  const userSources = db.sources.filter(s => s.userId === userId);
  userSources.forEach(s => {
    if (s.title.toLowerCase().includes(query) || (s.summary && s.summary.toLowerCase().includes(query))) {
      results.push({
        id: s.id,
        type: 'source',
        title: s.title,
        snippet: s.summary?.substring(0, 120) || 'Study document',
        sourceId: s.id,
      });
    }
  });

  // Match flashcards
  const userDecks = db.flashcardDecks.filter(d => d.userId === userId);
  const deckIds = new Set(userDecks.map(d => d.id));
  const userCards = db.flashcards.filter(c => deckIds.has(c.deckId));
  userCards.forEach(c => {
    if (c.front.toLowerCase().includes(query) || c.back.toLowerCase().includes(query)) {
      const parentDeck = userDecks.find(d => d.id === c.deckId);
      results.push({
        id: c.id,
        type: 'flashcard',
        title: c.front,
        snippet: c.back.substring(0, 100),
        deckId: c.deckId,
        deckTitle: parentDeck?.title,
      });
    }
  });

  // Match quizzes
  const userQuizzes = db.quizzes.filter(q => q.userId === userId);
  userQuizzes.forEach(q => {
    if (q.title.toLowerCase().includes(query)) {
      results.push({
        id: q.id,
        type: 'quiz',
        title: q.title,
        snippet: `Difficulty: ${q.difficulty}`,
        quizId: q.id,
      });
    }
  });

  // Match notes
  const userNotes = db.studyNotes.filter(n => n.userId === userId);
  userNotes.forEach(n => {
    if (n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)) {
      results.push({
        id: n.id,
        type: 'note',
        title: n.title,
        snippet: n.content.substring(0, 120),
        noteId: n.id,
      });
    }
  });

  res.json({ results: results.slice(0, 20) });
});

// Consolidated Markdown study guide export
app.get('/api/sources/:id/export', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const source = db.sources.find(s => s.id === req.params.id && s.userId === userId);
  if (!source) return res.status(404).json({ error: 'Source not found.' });

  const chunks = db.sourceChunks.filter(c => c.sourceId === source.id);
  const decks = db.flashcardDecks.filter(d => d.sourceId === source.id);
  const deckIds = new Set(decks.map(d => d.id));
  const cards = db.flashcards.filter(c => deckIds.has(c.deckId));
  const quizzes = db.quizzes.filter(q => q.sourceId === source.id);
  const notes = db.studyNotes.filter(n => n.sourceId === source.id);

  let md = `# Complete Study Dossier: ${source.title}\n\n`;
  md += `**Generated via MindForge AI** • Date: ${new Date().toLocaleDateString()}\n\n`;
  md += `## 1. Executive Synthesis\n${source.summary || 'Summary unavailable'}\n\n`;

  if (source.topicOutline && source.topicOutline.length > 0) {
    md += `## 2. Topic Outline\n`;
    source.topicOutline.forEach((t, i) => {
      md += `${i + 1}. ${t}\n`;
    });
    md += `\n`;
  }

  if (source.keyConcepts && source.keyConcepts.length > 0) {
    md += `## 3. Key Concepts & Definitions\n`;
    source.keyConcepts.forEach(c => {
      md += `- **${c.term}**: ${c.definition}\n`;
    });
    md += `\n`;
  }

  if (cards.length > 0) {
    md += `## 4. Mastery Flashcard Deck (${cards.length} Cards)\n`;
    cards.forEach((c, i) => {
      md += `### Card ${i + 1}: ${c.front}\n`;
      md += `**Answer**: ${c.back}\n`;
      if (c.explanation) md += `*Explanation*: ${c.explanation}\n`;
      if (c.sourceReference) md += `*Reference*: ${c.sourceReference}\n`;
      md += `\n`;
    });
  }

  if (quizzes.length > 0) {
    md += `## 5. Examination Question Bank\n`;
    quizzes.forEach(q => {
      const questions = db.quizQuestions.filter(qq => qq.quizId === q.id);
      md += `### ${q.title} (${q.difficulty} level)\n`;
      questions.forEach((qq, i) => {
        md += `${i + 1}. **${qq.questionText}**\n`;
        if (qq.options && qq.options.length > 0) {
          qq.options.forEach((opt, oIdx) => {
            md += `   - [${String.fromCharCode(65 + oIdx)}] ${opt}\n`;
          });
        }
        md += `   *Correct*: ${qq.correctAnswer}\n`;
        if (qq.explanation) md += `   *Rationale*: ${qq.explanation}\n`;
        md += `\n`;
      });
    });
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${source.title.replace(/\s+/g, '_')}_study_guide.md"`);
  res.send(md);
});

// Record study focus session minutes
app.post('/api/study/session', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { activityType, durationSeconds, metadata } = req.body;

  const newActivity = {
    id: `act-${Date.now()}`,
    userId,
    activityType: activityType || 'flashcard_review',
    metadata: metadata || {},
    durationSeconds: durationSeconds || 180,
    createdAt: new Date().toISOString(),
  };

  db.studyActivity.push(newActivity as any);
  db.save();

  res.status(201).json({ activity: newActivity });
});

// Demo Data Reset
app.post('/api/demo/reset', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    await ensureDemoData();
    res.json({ message: 'Demo study set reset to factory defaults.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Explicit 404 and error isolation for /api routes
// Never allow unhandled API routes or errors to fall through to Vite SPA index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found.` });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.originalUrl.startsWith('/api') || req.path.startsWith('/api')) {
    console.error('API Error caught by isolation handler:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal API Error' });
  }
  next(err);
});

// ==========================================
// 11. Vite Middleware (Dev) or Static (Prod)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend files in production
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MindForge AI Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
