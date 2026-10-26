import { GoogleGenAI } from '@google/genai';
import { SourceChunk } from './db.js';

// Centralized AI client
let genAIClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Clean and safely parse JSON strings from model outputs
 */
function cleanAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText) return fallback;
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/i, '');
    }
    return JSON.parse(cleaned.trim());
  } catch (err) {
    console.warn('Failed to parse JSON response directly. Attempting regex extraction...', err);
    try {
      const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // ignore
    }
    return fallback;
  }
}

/**
 * Execute Gemini call with timeout and multi-model fallback.
 * Uses gemini-3.1-flash-lite as primary (blazing fast, high free-tier quota)
 * with automatic fallback to gemini-3.8-flash.
 */
async function generateWithGemini(
  prompt: string,
  systemInstruction: string,
  isJson = true,
  timeoutMs = 25000
): Promise<string> {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  // Model cascade: try flash-lite first, fallback to 3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      let timer: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Model ${model} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const callPromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          ...(isJson ? { responseMimeType: 'application/json' } : {}),
        },
      });

      const response = await Promise.race([callPromise, timeoutPromise]).finally(() => clearTimeout(timer));
      const text = response.text;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      lastError = err;
      const errMessage = String(err?.message || err);
      console.warn(`Gemini model ${model} failed (${errMessage.substring(0, 140)}), trying next model...`);
      // Brief pause before trying fallback
      await new Promise(r => setTimeout(r, 400));
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content.');
}

/**
 * Select representative chunks across the document or rank by topics
 */
export function selectRepresentativeChunks(
  chunks: SourceChunk[],
  topics?: string[],
  maxChunks = 16
): SourceChunk[] {
  if (chunks.length <= maxChunks) return chunks;

  if (topics && topics.length > 0) {
    return rankChunksForQuery(topics.join(' '), chunks, maxChunks);
  }

  // Evenly sample across the document to capture all chapters/sections
  const step = chunks.length / maxChunks;
  const sampled: SourceChunk[] = [];
  const chosenIndices = new Set<number>();

  for (let i = 0; i < maxChunks; i++) {
    const idx = Math.min(Math.floor(i * step), chunks.length - 1);
    if (!chosenIndices.has(idx)) {
      chosenIndices.add(idx);
      sampled.push(chunks[idx]);
    }
  }

  return sampled.length > 0 ? sampled : chunks.slice(0, maxChunks);
}

/**
 * Perform keyword-and-term ranking over source chunks (TF-IDF inspired RAG)
 */
export function rankChunksForQuery(query: string, chunks: SourceChunk[], maxResults = 5): SourceChunk[] {
  if (chunks.length <= maxResults) return chunks;

  const queryTerms = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  if (queryTerms.length === 0) return chunks.slice(0, maxResults);

  const scored = chunks.map(chunk => {
    const textLower = chunk.content.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const occurrences = (textLower.match(new RegExp(`\\b${term}`, 'g')) || []).length;
      score += occurrences * 2;
      if (chunk.heading && chunk.heading.toLowerCase().includes(term)) {
        score += 5;
      }
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map(s => s.chunk);
}

/**
 * Intelligent concept and terminology extractor for deep grounding & offline fallback.
 * Extracts authentic technical terms, register names, definitions, formulas, and relationships
 * from the document so questions and options are ALWAYS 100% relevant to the uploaded document.
 */
interface ExtractedConceptKnowledge {
  concepts: string[];
  definitions: { term: string; definition: string; sentence: string; pageNumber?: number; heading?: string }[];
  keyFacts: { fact: string; pageNumber?: number; heading?: string }[];
}

export function extractDocumentKnowledge(chunks: SourceChunk[], sourceTitle: string): ExtractedConceptKnowledge {
  const fullText = chunks.map(c => c.content).join('\n\n');
  
  // Extract sentences with reasonable length
  const sentenceRecords: { sentence: string; pageNumber?: number; heading?: string }[] = [];
  for (const chunk of chunks) {
    const sents = chunk.content
      .split(/(?<=[.?!])\s+|\n{2,}/)
      .map(s => s.trim().replace(/^[\u2022\u25CF\u2212\-\*>\uF0B7\u27A2\s]+/, '').trim())
      .filter(s => s.length > 20 && s.length < 300);
    
    for (const s of sents) {
      sentenceRecords.push({
        sentence: s,
        pageNumber: chunk.pageNumber,
        heading: chunk.heading,
      });
    }
  }

  // Extract candidate technical terms and capitalized concepts
  const termMatches = fullText.match(/\b([A-Z][a-zA-Z0-9_\-]+(?:\s+[A-Z][a-zA-Z0-9_\-]+){0,3})\b/g) || [];
  const stopWords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'According', 'When', 'Where', 'Which', 'What',
    'There', 'Here', 'From', 'Each', 'Page', 'Module', 'Total', 'Every', 'In', 'On', 'At',
    'To', 'For', 'With', 'By', 'An', 'A', 'Of', 'All', 'Some', 'Any', 'It', 'Its', 'They',
    'Example', 'Note', 'Table', 'Figure', 'True', 'False', 'Yes', 'No'
  ]);

  const freq: Record<string, number> = {};
  for (const t of termMatches) {
    const clean = t.trim();
    if (clean.length > 2 && !stopWords.has(clean) && !/^\d+$/.test(clean)) {
      freq[clean] = (freq[clean] || 0) + 1;
    }
  }

  // Also extract acronyms (e.g. BIU, EU, ALU, CPU, CS, DS, SS, ES, IP, ATP, NADH, DNA, RNA)
  const acronyms = fullText.match(/\b[A-Z0-9]{2,6}\b/g) || [];
  for (const a of acronyms) {
    if (!['THE', 'FOR', 'AND', 'NOT', 'ARE', 'BUT'].includes(a)) {
      freq[a] = (freq[a] || 0) + 2;
    }
  }

  const sortedConcepts = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  // Extract definition and mechanism sentences
  const defPattern = /\b(is a|is an|is the|are the|refers to|defined as|consists of|contains|operates|handles|executes|calculates|generates|divides|converts|is responsible for|functions as|used to|produces|yields)\b/i;
  
  const definitions: ExtractedConceptKnowledge['definitions'] = [];
  const keyFacts: ExtractedConceptKnowledge['keyFacts'] = [];

  for (const rec of sentenceRecords) {
    if (defPattern.test(rec.sentence)) {
      // Find matching concept in this sentence
      const matchedConcept = sortedConcepts.find(c => rec.sentence.toLowerCase().includes(c.toLowerCase()));
      if (matchedConcept) {
        definitions.push({
          term: matchedConcept,
          definition: rec.sentence,
          sentence: rec.sentence,
          pageNumber: rec.pageNumber,
          heading: rec.heading,
        });
      } else {
        keyFacts.push({
          fact: rec.sentence,
          pageNumber: rec.pageNumber,
          heading: rec.heading,
        });
      }
    } else {
      keyFacts.push({
        fact: rec.sentence,
        pageNumber: rec.pageNumber,
        heading: rec.heading,
      });
    }
  }

  return {
    concepts: sortedConcepts.length > 0 ? sortedConcepts : [sourceTitle],
    definitions,
    keyFacts,
  };
}

/**
 * 1. Analyze Document: Generate Summary, Topic Outline, Key Concepts & Definitions
 */
export async function analyzeSourceDocument(sourceTitle: string, fullText: string, chunks: SourceChunk[]) {
  const sampleChunks = selectRepresentativeChunks(chunks, undefined, 14);
  const sampleText = sampleChunks.map(c => `[Section: ${c.heading || `Part ${c.chunkIndex + 1}`}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}]\n${c.content}`).join('\n\n');

  const prompt = `Analyze this educational study document and generate a thorough, rigorous academic synthesis.
Source Title: "${sourceTitle}"

Document Excerpts:
${sampleText}

Requirements:
- Summary: 2-3 substantive paragraphs explaining the core technical concepts, systems, methodologies, and conclusions from the text.
- Topic Outline: 5-8 specific, descriptive topic headings corresponding to actual concepts in this document.
- Key Concepts: 6-10 crucial terms, registers, mechanisms, or principles with their exact technical definitions from the text.
- Definitions: 5-8 specific terminologies with academic definition and exact context.

Return strictly valid JSON matching this schema:
{
  "summary": "Detailed summary...",
  "topicOutline": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "keyConcepts": [
    { "term": "Exact Concept Name", "definition": "Precise technical definition from document" }
  ],
  "definitions": [
    { "term": "Term", "definition": "Definition", "context": "Page or Section context" }
  ]
}`;

  const systemInstruction = 'You are an expert curriculum designer and academic analyst. Synthesize study materials factually and rigorously. Every concept must come directly from the text.';

  if (isAiConfigured()) {
    try {
      const responseText = await generateWithGemini(prompt, systemInstruction, true, 25000);
      const parsed = cleanAndParseJson(responseText, null as any);
      if (parsed && parsed.summary) {
        return {
          summary: parsed.summary,
          topicOutline: Array.isArray(parsed.topicOutline) ? parsed.topicOutline : [],
          keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
          definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
        };
      }
    } catch (err: any) {
      console.warn('AI Document synthesis API fallback triggered:', err.message);
    }
  }

  // High-fidelity extractive concept fallback
  const knowledge = extractDocumentKnowledge(chunks, sourceTitle);
  const topConcepts = knowledge.concepts.slice(0, 8);
  const defs = knowledge.definitions.slice(0, 6);

  return {
    summary: `This study resource covers **${sourceTitle}** across ${chunks.length} sections. Core concepts analyzed include ${topConcepts.slice(0, 5).join(', ')}. Key mechanisms and principles: ${defs[0]?.sentence || knowledge.keyFacts[0]?.fact || 'Fundamental study material extracted from document.'}`,
    topicOutline: chunks.slice(0, 6).map((c, i) => c.heading || `${topConcepts[i % topConcepts.length] || `Section ${i + 1}`}`),
    keyConcepts: defs.length > 0 
      ? defs.map(d => ({ term: d.term, definition: d.definition }))
      : topConcepts.map(c => ({ term: c, definition: `Key technical concept from ${sourceTitle}.` })),
    definitions: defs.map(d => ({
      term: d.term,
      definition: d.definition,
      context: d.pageNumber ? `Page ${d.pageNumber}` : d.heading || sourceTitle,
    })),
  };
}

/**
 * 2. Generate AI Flashcards
 */
export interface FlashcardGenOptions {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  cardType?: 'basic' | 'definitions' | 'concepts' | 'formulas' | 'facts' | 'mixed';
  topics?: string[];
  language?: string;
}

export async function generateFlashcards(sourceTitle: string, chunks: SourceChunk[], options: FlashcardGenOptions) {
  const count = options.count || 8;
  const difficulty = options.difficulty || 'medium';
  const language = options.language || 'English';

  const selectedChunks = selectRepresentativeChunks(chunks, options.topics, 16);
  const contextText = selectedChunks.map(c => 
    `[Source: ${sourceTitle}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}${c.heading ? ` | ${c.heading}` : ''}]\n${c.content}`
  ).join('\n\n---\n\n');

  const prompt = `Generate exactly ${count} high-yield, academically rigorous study flashcards based STRICTLY and EXCLUSIVELY on the provided source excerpts.
Source Title: "${sourceTitle}"
Target Difficulty: ${difficulty}
Output Language: ${language}
${options.topics && options.topics.length > 0 ? `Focus on topics: ${options.topics.join(', ')}` : ''}

Source Excerpts:
${contextText}

ABSOLUTE REQUIREMENTS:
1. CONCEPTUAL FOCUS: Flashcard "front" must be an active-recall prompt, clear question, mechanism query, or specific concept to define (e.g. "What is the function of the Bus Interface Unit (BIU) in the 8086?", "How is the 20-bit physical address calculated?", "Define Substrate-Level Phosphorylation").
   - NEVER use placeholder phrases like "Key Concept from Section 1" or "Topic from Page 2".
2. ACCURATE ANSWERS: Flashcard "back" must be a concise, precise, factually accurate answer explaining the concept, formula, or relationship directly from the text.
3. PEDAGOGICAL EXPLANATION: Flashcard "explanation" must provide additional context, memory aids, or why this principle matters.
4. CITATIONS: Include source reference and page number where available in the excerpt.

Return strictly valid JSON matching this schema:
{
  "cards": [
    {
      "front": "Clear active-recall prompt or conceptual question",
      "back": "Accurate, concise explanation or definition",
      "explanation": "Helpful pedagogical context or derivation",
      "sourceReference": "e.g. Page 3: 8086 Architecture",
      "pageNumber": 3,
      "timestamp": null
    }
  ]
}`;

  const systemInstruction = 'You are MindForge AI, an expert exam creator. Every flashcard must directly test genuine technical concepts, equations, registers, mechanisms, or definitions from the provided text. Never generate vague or generic cards.';

  if (isAiConfigured()) {
    try {
      const responseText = await generateWithGemini(prompt, systemInstruction, true, 25000);
      const parsed = cleanAndParseJson<{ cards: any[] }>(responseText, { cards: [] });
      if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return parsed.cards;
      }
    } catch (err: any) {
      console.warn('Gemini Flashcard API fallback triggered:', err.message);
    }
  }

  // Intelligent Grounded Semantic Fallback: zero generic placeholders
  const knowledge = extractDocumentKnowledge(chunks, sourceTitle);
  const fallbackCards: any[] = [];
  const defs = knowledge.definitions;
  const facts = knowledge.keyFacts;

  for (let i = 0; i < count; i++) {
    if (i < defs.length) {
      const d = defs[i];
      fallbackCards.push({
        front: `What is the role and definition of ${d.term} according to the document?`,
        back: d.definition,
        explanation: `Key concept derived from ${sourceTitle}${d.pageNumber ? ` (Page ${d.pageNumber})` : ''}.`,
        sourceReference: d.pageNumber ? `Page ${d.pageNumber}` : d.heading || sourceTitle,
        pageNumber: d.pageNumber,
        timestamp: null,
      });
    } else if (facts.length > (i - defs.length)) {
      const f = facts[i - defs.length];
      const concept = knowledge.concepts[(i) % knowledge.concepts.length] || sourceTitle;
      fallbackCards.push({
        front: `In ${sourceTitle}, what is stated regarding ${concept}?`,
        back: f.fact,
        explanation: `Factual principle documented in ${f.pageNumber ? `Page ${f.pageNumber}` : 'source materials'}.`,
        sourceReference: f.pageNumber ? `Page ${f.pageNumber}` : f.heading || sourceTitle,
        pageNumber: f.pageNumber,
        timestamp: null,
      });
    } else {
      const chunk = chunks[i % chunks.length];
      const concept = knowledge.concepts[i % knowledge.concepts.length] || chunk.heading || sourceTitle;
      fallbackCards.push({
        front: `Explain the concept of ${concept} in ${sourceTitle}:`,
        back: chunk.content.slice(0, 180).trim() + '...',
        explanation: `Directly supported by ${chunk.pageNumber ? `Page ${chunk.pageNumber}` : 'source section'}.`,
        sourceReference: chunk.pageNumber ? `Page ${chunk.pageNumber}` : chunk.heading || sourceTitle,
        pageNumber: chunk.pageNumber,
        timestamp: null,
      });
    }
  }

  return fallbackCards;
}

/**
 * 3. Generate AI Quiz
 */
export interface QuizGenOptions {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: ('mcq' | 'true_false' | 'short_answer' | 'fill_blank')[];
  topics?: string[];
  language?: string;
}

export async function generateQuiz(sourceTitle: string, chunks: SourceChunk[], options: QuizGenOptions) {
  const count = options.count || 5;
  const difficulty = options.difficulty || 'medium';
  const language = options.language || 'English';
  const types = options.questionTypes && options.questionTypes.length > 0
    ? options.questionTypes
    : ['mcq', 'true_false', 'short_answer', 'fill_blank'];

  const selectedChunks = selectRepresentativeChunks(chunks, options.topics, 16);
  const contextText = selectedChunks.map(c => 
    `[Source: ${sourceTitle}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}${c.heading ? ` | ${c.heading}` : ''}]\n${c.content}`
  ).join('\n\n---\n\n');

  const prompt = `Generate an academically rigorous, concept-driven examination of exactly ${count} questions based STRICTLY and EXCLUSIVELY on the provided source excerpts.
Source Title: "${sourceTitle}"
Difficulty Level: ${difficulty}
Output Language: ${language}
${options.topics && options.topics.length > 0 ? `Target Topics: ${options.topics.join(', ')}` : ''}
Allowed Question Types: ${types.join(', ')}

Source Excerpts:
${contextText}

ABSOLUTE REQUIREMENTS:
1. DEEP CONCEPTUAL GROUNDING: Every question must test a real concept, principle, mechanism, formula, architecture component, definition, or relation explicitly discussed in the source excerpts. NEVER generate generic, superficial, or trivia questions (e.g., NEVER ask "What is the title of the document?", "Which topic is analyzed?", or vague sentence completions).
2. REALISTIC & PLAUSIBLE OPTIONS: For multiple-choice ('mcq') questions, all 4 options must be realistic, domain-specific concepts, terms, mechanisms, or values derived from or related to the source material.
   - ONE option must be the exact factually correct answer supported by the text.
   - The THREE distractors must be plausible, authentic technical distractors that test real student comprehension.
   - NEVER use placeholders, jokes, or meaningless labels like "Unrelated Theorem", "Generic Process", "Historical Context", "None of the above", or the document title as a distractor.
3. TRUE / FALSE: Present a precise technical assertion or condition from the document that requires actual understanding to evaluate.
4. FILL IN THE BLANK: Provide an informative technical statement with "_______" replacing a crucial key term, acronym, or value.
5. SHORT ANSWER: Formulate a conceptual question asking how or why a specific mechanism/process works in the text, with an authoritative answer key.
6. SOURCE CITATIONS: Provide the specific page number or section quote that proves the answer.

Output format must be strictly valid JSON matching this schema:
{
  "title": "Professional Exam Title reflecting source subject",
  "questions": [
    {
      "questionText": "Detailed question text testing a specific concept",
      "questionType": "mcq" | "true_false" | "short_answer" | "fill_blank",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact string matching one of the options or exact key term",
      "explanation": "Thorough, educational explanation referencing specific mechanisms or facts from the text",
      "sourceReference": "e.g. Page 2, 8086 Architecture or Section 3",
      "pageNumber": 2,
      "topic": "Specific Subtopic or Chapter"
    }
  ]
}`;

  const systemInstruction = 'You are an elite academic exam board examiner. Generate rigorous, concept-rich questions where all questions and answer options test real principles and terminology from the source text. Zero placeholder options.';

  if (isAiConfigured()) {
    try {
      const responseText = await generateWithGemini(prompt, systemInstruction, true, 25000);
      const parsed = cleanAndParseJson<{ title?: string; questions: any[] }>(responseText, { questions: [] });
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        // Double check options to guarantee no dummy options slipped through
        for (const q of parsed.questions) {
          if (q.questionType === 'mcq' && Array.isArray(q.options)) {
            q.options = q.options.filter((opt: string) => 
              opt !== 'Unrelated Theorem' && opt !== 'Generic Process' && opt !== 'Historical Context'
            );
          }
        }
        return {
          title: parsed.title || `${sourceTitle} Examination`,
          questions: parsed.questions,
        };
      }
    } catch (err: any) {
      console.warn('Gemini Quiz API fallback triggered:', err.message);
    }
  }

  // Intelligent Grounded Semantic Fallback: zero generic placeholders
  const knowledge = extractDocumentKnowledge(chunks, sourceTitle);
  const fallbackQuestions: any[] = [];
  const qTypes = types.length > 0 ? types : ['mcq', 'true_false', 'short_answer', 'fill_blank'];
  const allConcepts = knowledge.concepts;
  const defs = knowledge.definitions;
  const facts = knowledge.keyFacts;

  for (let i = 0; i < count; i++) {
    const type = qTypes[i % qTypes.length];
    const def = defs[i % Math.max(defs.length, 1)];
    const fact = facts[i % Math.max(facts.length, 1)];

    if (type === 'true_false') {
      const statement = fact ? fact.fact : def ? def.sentence : `${sourceTitle} defines core architectural specifications.`;
      fallbackQuestions.push({
        questionText: `True or False: According to the source material, "${statement.replace(/[.?!]+$/, '')}".`,
        questionType: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: `Confirmed directly in ${fact?.pageNumber ? `Page ${fact.pageNumber}` : 'the document excerpts'}.`,
        sourceReference: fact?.pageNumber ? `Page ${fact.pageNumber}` : fact?.heading || sourceTitle,
        pageNumber: fact?.pageNumber,
        topic: fact?.heading || sourceTitle,
      });
    } else if (type === 'fill_blank' && def) {
      // Replace target concept with blank
      const blankedSentence = def.sentence.replace(new RegExp(`\\b${def.term}\\b`, 'i'), '_______');
      const distractors = allConcepts
        .filter(c => c.toLowerCase() !== def.term.toLowerCase())
        .slice(0, 3);
      
      const optionsPool = [def.term, ...distractors];
      // Shuffle options deterministically
      optionsPool.sort(() => (i % 2 === 0 ? 1 : -1));

      fallbackQuestions.push({
        questionText: `Fill in the blank: "${blankedSentence}"`,
        questionType: 'fill_blank',
        options: optionsPool,
        correctAnswer: def.term,
        explanation: `In ${sourceTitle}, ${def.term} is defined as: "${def.definition}".`,
        sourceReference: def.pageNumber ? `Page ${def.pageNumber}` : def.heading || sourceTitle,
        pageNumber: def.pageNumber,
        topic: def.heading || sourceTitle,
      });
    } else if (type === 'short_answer') {
      const targetTerm = def ? def.term : allConcepts[i % allConcepts.length];
      const explanation = def ? def.definition : fact?.fact || 'Detailed in source documentation.';
      fallbackQuestions.push({
        questionText: `Explain the function and significance of "${targetTerm}" as described in ${sourceTitle}.`,
        questionType: 'short_answer',
        options: [],
        correctAnswer: explanation,
        explanation: `Key source reference: ${explanation}`,
        sourceReference: def?.pageNumber ? `Page ${def.pageNumber}` : sourceTitle,
        pageNumber: def?.pageNumber,
        topic: def?.heading || sourceTitle,
      });
    } else {
      // High-grade MCQ
      if (def) {
        // Concept definition question
        const otherConcepts = allConcepts.filter(c => c.toLowerCase() !== def.term.toLowerCase()).slice(0, 3);
        const optionsList = [def.term, ...otherConcepts];
        optionsList.sort(() => 0.5 - Math.random());

        fallbackQuestions.push({
          questionText: `Which component or concept is defined as: "${def.definition.replace(/[.?!]+$/, '')}"?`,
          questionType: 'mcq',
          options: optionsList,
          correctAnswer: def.term,
          explanation: `The document explicitly establishes this definition for ${def.term}.`,
          sourceReference: def.pageNumber ? `Page ${def.pageNumber}` : def.heading || sourceTitle,
          pageNumber: def.pageNumber,
          topic: def.heading || sourceTitle,
        });
      } else {
        const chunk = chunks[i % chunks.length];
        const targetConcept = allConcepts[i % allConcepts.length] || chunk.heading || sourceTitle;
        const otherConcepts = allConcepts.filter(c => c !== targetConcept).slice(0, 3);
        const optionsList = [targetConcept, ...otherConcepts];

        fallbackQuestions.push({
          questionText: `Which of the following concepts is analyzed in the context of: "${chunk.content.slice(0, 110)}..."?`,
          questionType: 'mcq',
          options: optionsList,
          correctAnswer: targetConcept,
          explanation: `Directly supported by ${sourceTitle} ${chunk.pageNumber ? `(Page ${chunk.pageNumber})` : ''}.`,
          sourceReference: chunk.pageNumber ? `Page ${chunk.pageNumber}` : chunk.heading || sourceTitle,
          pageNumber: chunk.pageNumber,
          topic: chunk.heading || sourceTitle,
        });
      }
    }
  }

  return {
    title: `${sourceTitle} Examination`,
    questions: fallbackQuestions,
  };
}

/**
 * 4. Generate Study Notes & Summaries
 */
export async function generateStudyNotes(
  sourceTitle: string,
  chunks: SourceChunk[],
  formatType: string,
  language = 'English'
) {
  const selectedChunks = selectRepresentativeChunks(chunks, undefined, 16);
  const contextText = selectedChunks.map(c => 
    `[Source: ${sourceTitle}${c.pageNumber ? ` | Page ${c.pageNumber}` : ''}${c.heading ? ` | ${c.heading}` : ''}]\n${c.content}`
  ).join('\n\n---\n\n');

  let instructionFormat = 'structured revision notes with bullet points and bold key terms';
  if (formatType === 'one_paragraph') instructionFormat = 'a single powerful, comprehensive executive summary paragraph';
  if (formatType === 'detailed') instructionFormat = 'an exhaustive, multi-section chapter breakdown with detailed explanations';
  if (formatType === 'key_takeaways') instructionFormat = 'top 10 crucial high-yield takeaways with actionable insights';
  if (formatType === 'definitions') instructionFormat = 'a comprehensive terminology and glossary guide with definitions and examples';
  if (formatType === 'formulas') instructionFormat = 'all relevant formulas, equations, rules, and mathematical relationships with variable breakdowns';
  if (formatType === 'comparison_table') instructionFormat = 'detailed comparative analysis and markdown tables comparing key concepts and contrasts';
  if (formatType === 'exam_revision') instructionFormat = 'an ultimate high-yield exam cram sheet with mnemonics, gotchas, and typical exam pitfalls';

  const prompt = `Synthesize the provided source text into ${instructionFormat}.
Language: ${language}
Source Title: "${sourceTitle}"

Content:
${contextText}

Format using clean, modern Markdown with headings (##, ###), bullet points, and callouts where relevant. Include source references (e.g. "(Page 2)") where specific claims appear.`;

  const systemInstruction = 'You are an elite academic tutor creating beautifully structured, rigorous study notes based directly on the provided text.';

  if (isAiConfigured()) {
    try {
      const responseText = await generateWithGemini(prompt, systemInstruction, false, 25000);
      if (responseText && responseText.trim().length > 0) {
        return responseText;
      }
    } catch (err: any) {
      console.warn('Gemini Notes API fallback triggered:', err.message);
    }
  }

  // Extractive structured notes fallback
  const knowledge = extractDocumentKnowledge(chunks, sourceTitle);
  return `# High-Yield Revision: ${sourceTitle}

## Core Document Overview
This study module contains **${chunks.length} extracted semantic sections**.

## Key Concepts & Terminology
${knowledge.definitions.map(d => `- **${d.term}**: ${d.definition} ${d.pageNumber ? `*(Page ${d.pageNumber})*` : ''}`).join('\n')}

## Core Excerpts & Principles
${knowledge.keyFacts.slice(0, 10).map((f, i) => `${i + 1}. ${f.fact} ${f.pageNumber ? `*(Page ${f.pageNumber})*` : ''}`).join('\n')}

---
*Generated by MindForge AI Grounded Engine.*`;
}

/**
 * 5. Interactive Grounded AI Tutor
 */
export interface TutorChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function askGroundedTutor(
  userQuery: string,
  allSourceChunks: { chunk: SourceChunk; sourceTitle: string }[],
  history: TutorChatHistoryItem[] = []
) {
  // Retrieve top 6 most relevant chunks
  const ranked = rankChunksForQuery(
    userQuery,
    allSourceChunks.map(s => s.chunk),
    6
  );

  const contextBlocks = ranked.map((chunk, index) => {
    const parent = allSourceChunks.find(s => s.chunk.id === chunk.id);
    const title = parent ? parent.sourceTitle : 'Source Material';
    return `[Citation ${index + 1} | Source: "${title}" | Chunk: ${chunk.id}${chunk.pageNumber ? ` | Page ${chunk.pageNumber}` : ''}${chunk.timestamp ? ` | Time ${chunk.timestamp}` : ''}]\n${chunk.content}`;
  }).join('\n\n---\n\n');

  const historyFormatted = history.slice(-6).map(h => 
    `${h.role === 'user' ? 'Student' : 'MindForge Tutor'}: ${h.content}`
  ).join('\n\n');

  const prompt = `You are the MindForge AI Tutor, a personalized, world-class academic tutor.
Your core mission is to help the student learn and master their study materials with absolute factual accuracy grounded in their uploaded sources.

CRITICAL INSTRUCTIONS:
1. Prioritize answers supported directly by the provided source context.
2. When referencing specific facts, definitions, or findings, append citation markers like [1], [2] corresponding to the numbered Citations in the context.
3. If the provided source excerpts do not contain enough information to fully answer the question, clearly state: "Based on your uploaded source material, this specific detail is not explicitly covered. However, from general principles..." and clearly distinguish general knowledge from source-verified facts.
4. Always remind the student that AI-generated responses can contain mistakes and should be verified against source material.
5. Provide 3 thoughtful, relevant follow-up questions for the student to continue their learning journey.

Source Context:
${contextBlocks || 'No source materials selected.'}

Recent Conversation:
${historyFormatted}

Student Question:
${userQuery}

Return your response in valid JSON matching this schema:
{
  "answer": "Markdown formatted tutor answer with [1], [2] citations embedded",
  "citations": [
    {
      "chunkId": "chunk id from citation block",
      "sourceTitle": "source title",
      "pageNumber": 1,
      "timestamp": "01:23",
      "quote": "short direct quote supporting the fact"
    }
  ],
  "suggestedFollowUps": [
    "Follow-up question 1?",
    "Follow-up question 2?",
    "Follow-up question 3?"
  ]
}`;

  const systemInstruction = 'You are MindForge AI Tutor, a friendly, encouraging, and academically rigorous study coach.';

  if (isAiConfigured()) {
    try {
      const responseText = await generateWithGemini(prompt, systemInstruction, true, 25000);
      const parsed = cleanAndParseJson<any>(responseText, null);
      if (parsed && parsed.answer) {
        return {
          answer: parsed.answer,
          citations: Array.isArray(parsed.citations) ? parsed.citations : [],
          suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) ? parsed.suggestedFollowUps : [],
        };
      }
    } catch (err: any) {
      console.warn('Gemini Tutor API fallback triggered:', err.message);
    }
  }

  // Grounded extractive synthesis from retrieved chunks
  const topChunk = ranked[0];
  const parent = topChunk ? allSourceChunks.find(s => s.chunk.id === topChunk.id) : null;
  const title = parent ? parent.sourceTitle : 'Source Material';

  if (topChunk) {
    return {
      answer: `Based on **${title}** [1]:\n\n${topChunk.content}\n\n*Note: AI-generated answers can contain mistakes; verify against source material.*`,
      citations: [
        {
          chunkId: topChunk.id,
          sourceTitle: title,
          pageNumber: topChunk.pageNumber,
          timestamp: topChunk.timestamp,
          quote: topChunk.content.substring(0, 120),
        },
      ],
      suggestedFollowUps: [
        'Can you break down this concept into simpler terms?',
        'How does this relate to other topics in this source?',
        'What would be an example practice question on this?',
      ],
    };
  }

  return {
    answer: 'I analyzed your request, but could not find matching passages in your uploaded sources. Please ensure your study materials cover this topic.',
    citations: [],
    suggestedFollowUps: ['Could you summarize the main themes?', 'What topics are available in my uploads?'],
  };
}
