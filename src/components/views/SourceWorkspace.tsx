import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Video,
  FileCode,
  BookOpen,
  HelpCircle,
  Brain,
  Sparkles,
  Layers,
  Clock,
  BookCheck,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Edit2,
  Check,
} from 'lucide-react';
import { api } from '../../api';
import { Source, SourceChunk, FlashcardDeck, Quiz, StudyNote } from '../../types';
import { AppTab } from '../Sidebar';

interface SourceWorkspaceProps {
  sourceId: string;
  onBack: () => void;
  onSelectDeck: (deckId: string) => void;
  onSelectQuiz: (quizId: string) => void;
  onSelectTab: (tab: AppTab) => void;
}

export const SourceWorkspace: React.FC<SourceWorkspaceProps> = ({
  sourceId,
  onBack,
  onSelectDeck,
  onSelectQuiz,
  onSelectTab,
}) => {
  const [source, setSource] = useState<Source | null>(null);
  const [chunks, setChunks] = useState<SourceChunk[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'chunks' | 'generate' | 'materials'>('overview');

  // Generator form states
  const [genType, setGenType] = useState<'flashcards' | 'quiz' | 'notes'>('flashcards');
  const [cardCount, setCardCount] = useState(8);
  const [quizCount, setQuizCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [quizTypes, setQuizTypes] = useState<string[]>(['mcq', 'true_false', 'short_answer', 'fill_blank']);
  const [noteFormat, setNoteFormat] = useState('exam_revision');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Chunk search
  const [chunkSearch, setChunkSearch] = useState('');

  // Title edit
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const loadSourceData = async () => {
    try {
      setLoading(true);
      const res = await api.getSource(sourceId);
      setSource(res.source);
      setTitleInput(res.source.title);
      setChunks(res.chunks || []);
      setDecks(res.decks || []);
      setQuizzes(res.quizzes || []);
      setNotes(res.notes || []);
    } catch (err) {
      console.error('Failed to load source details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSourceData();
  }, [sourceId]);

  const handleUpdateTitle = async () => {
    if (!titleInput.trim() || !source) return;
    try {
      const res = await api.updateSourceTitle(source.id, titleInput.trim());
      setSource(res.source);
      setIsEditingTitle(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update title');
    }
  };

  const handleGenerate = async () => {
    if (!source) return;
    setIsGenerating(true);
    setGenError(null);

    try {
      if (genType === 'flashcards') {
        const res = await api.generateFlashcards({
          sourceId: source.id,
          count: cardCount,
          difficulty,
        });
        setDecks(prev => [res.deck, ...prev]);
        onSelectDeck(res.deck.id);
      } else if (genType === 'quiz') {
        const res = await api.generateQuiz({
          sourceId: source.id,
          count: quizCount,
          difficulty,
          questionTypes: quizTypes as any,
        });
        setQuizzes(prev => [res.quiz, ...prev]);
        onSelectQuiz(res.quiz.id);
      } else if (genType === 'notes') {
        const res = await api.generateNotes({
          sourceId: source.id,
          formatType: noteFormat,
        });
        setNotes(prev => [res.note, ...prev]);
        setActiveTab('materials');
      }
    } catch (err: any) {
      setGenError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuizType = (type: string) => {
    setQuizTypes(prev =>
      prev.includes(type) ? (prev.length > 1 ? prev.filter(t => t !== type) : prev) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
        <p className="text-xs text-slate-400">Loading source workspace & extracted chunks...</p>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-base font-semibold text-white">Source not found</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
        >
          Return to Sources
        </button>
      </div>
    );
  }

  const filteredChunks = chunks.filter(c => {
    if (!chunkSearch.trim()) return true;
    return (
      c.content.toLowerCase().includes(chunkSearch.toLowerCase()) ||
      (c.heading && c.heading.toLowerCase().includes(chunkSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sources</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('generate');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Study Tool</span>
          </button>
          <button
            onClick={async () => {
              if (!source) return;
              try {
                const mdContent = await api.exportSourceGuide(source.id);
                const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${source.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Dossier.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (err) {
                alert('Export failed');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            title="Download full Markdown study guide with vocabulary and key questions"
          >
            <BookCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Dossier (.md)</span>
          </button>
          <button
            onClick={() => onSelectTab('tutor')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ask Tutor</span>
          </button>
        </div>
      </div>

      {/* Source Workspace Header */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              {source.type === 'youtube' ? <Video className="w-5 h-5 text-violet-400" /> : <FileText className="w-5 h-5" />}
            </span>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-950 border border-indigo-500 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTitle}
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">{source.title}</h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Clean Unboxed Metadata with Tabular Numerals */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="uppercase">{source.type}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{source.chunkCount} Chunks</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{source.wordCount} Words</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Grounding Ready</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 pt-2 gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-semibold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Analysis
          </button>
          <button
            onClick={() => setActiveTab('chunks')}
            className={`pb-3 font-semibold transition-colors cursor-pointer ${
              activeTab === 'chunks'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Extracted Chunks ({chunks.length})
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-3 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Generate Study Tools</span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-3 font-semibold transition-colors cursor-pointer ${
              activeTab === 'materials'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Linked Materials ({decks.length + quizzes.length + notes.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SYNTHESIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Document Summary</span>
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {source.summary || 'Summary unavailable.'}
            </p>
          </div>

          {/* Topics and Key Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topic Outline */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Core Topic Outline
              </h3>
              {source.topicOutline && source.topicOutline.length > 0 ? (
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  {source.topicOutline.map((topic, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No topic outline generated.</p>
              )}
            </div>

            {/* Key Concepts */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Key Concepts & Terminology
              </h3>
              {source.keyConcepts && source.keyConcepts.length > 0 ? (
                <div className="space-y-3">
                  {source.keyConcepts.map((concept, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <p className="font-semibold text-indigo-300">{concept.term}</p>
                      <p className="text-slate-400 leading-relaxed">{concept.definition}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No key concepts generated.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXTRACTED CHUNKS */}
      {activeTab === 'chunks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chunkSearch}
                onChange={e => setChunkSearch(e.target.value)}
                placeholder="Search extracted paragraphs and citations..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredChunks.length} of {chunks.length} chunks
            </span>
          </div>

          <div className="space-y-3">
            {filteredChunks.map(chunk => (
              <div
                key={chunk.id}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono border-b border-slate-800/80 pb-2">
                  <span className="font-semibold text-indigo-400">Section {chunk.chunkIndex + 1}</span>
                  <div className="flex items-center gap-3">
                    {chunk.pageNumber && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Page {chunk.pageNumber}
                      </span>
                    )}
                    {chunk.timestamp && (
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        Time {chunk.timestamp}
                      </span>
                    )}
                    <span>{chunk.tokenCount || 80} tokens</span>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans text-xs sm:text-sm whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GENERATOR CONTROLS */}
      {activeTab === 'generate' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>AI Learning Resource Generator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select the study tool you want to create based strictly on "{source.title}".
            </p>
          </div>

          {genError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{genError}</span>
            </div>
          )}

          {/* Study Tool Selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
              { id: 'quiz', label: 'Practice Quiz', icon: HelpCircle },
              { id: 'notes', label: 'Revision Notes', icon: BookCheck },
            ].map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setGenType(tool.id as any)}
                  className={`p-4 rounded-2xl border text-center transition-all space-y-1.5 cursor-pointer ${
                    genType === tool.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold shadow-md'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto ${genType === tool.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <p className="text-xs">{tool.label}</p>
                </button>
              );
            })}
          </div>

          {/* Flashcard options */}
          {genType === 'flashcards' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Number of Flashcards: <span className="text-indigo-400 font-bold">{Number.isFinite(cardCount) ? cardCount : 8}</span>
                </label>
                <input
                  type="range"
                  min={4}
                  max={20}
                  step={2}
                  value={Number.isFinite(cardCount) ? cardCount : 8}
                  onChange={e => {
                    const parsed = parseInt(e.target.value, 10);
                    setCardCount(Number.isFinite(parsed) ? parsed : 8);
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Difficulty</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {['easy', 'medium', 'hard', 'mixed'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d as any)}
                      className={`py-2 rounded-xl border capitalize transition-all cursor-pointer ${
                        difficulty === d
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quiz options */}
          {genType === 'quiz' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Number of Questions: <span className="text-indigo-400 font-bold">{Number.isFinite(quizCount) ? quizCount : 5}</span>
                </label>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={Number.isFinite(quizCount) ? quizCount : 5}
                  onChange={e => {
                    const parsed = parseInt(e.target.value, 10);
                    setQuizCount(Number.isFinite(parsed) ? parsed : 5);
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Question Formats</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'mcq', label: 'Multiple Choice (MCQ)' },
                    { id: 'true_false', label: 'True or False' },
                    { id: 'short_answer', label: 'Short Answer' },
                    { id: 'fill_blank', label: 'Fill in the Blank' },
                  ].map(t => {
                    const active = quizTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleQuizType(t.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          active
                            ? 'border-indigo-500 bg-indigo-500/15 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        <span>{t.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Notes options */}
          {genType === 'notes' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-medium text-slate-300">Revision Note Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'exam_revision', label: 'High-Yield Exam Cram Sheet' },
                  { id: 'one_paragraph', label: 'Executive Summary' },
                  { id: 'detailed', label: 'Chapter Breakdown' },
                  { id: 'definitions', label: 'Glossary & Terminology Guide' },
                  { id: 'formulas', label: 'Formulas & Scientific Laws' },
                  { id: 'comparison_table', label: 'Comparative Matrix' },
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setNoteFormat(fmt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      noteFormat === fmt.id
                        ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-xs shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Study Materials with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {genType === 'flashcards' ? 'Flashcards' : genType === 'quiz' ? 'Quiz Exam' : 'Revision Notes'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 4: LINKED MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          {/* Flashcard Decks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Flashcard Decks ({decks.length})</span>
            </h3>
            {decks.length === 0 ? (
              <p className="text-xs text-slate-500">No decks generated yet for this source.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {decks.map(deck => (
                  <div
                    key={deck.id}
                    onClick={() => onSelectDeck(deck.id)}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    <h4 className="text-xs font-semibold text-white">{deck.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{deck.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quizzes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Quizzes & Assessments ({quizzes.length})</span>
            </h3>
            {quizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No quizzes generated yet for this source.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quizzes.map(quiz => (
                  <div
                    key={quiz.id}
                    onClick={() => onSelectQuiz(quiz.id)}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/50 hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    <h4 className="text-xs font-semibold text-white">{quiz.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 capitalize">Difficulty: {quiz.difficulty}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-violet-400" />
              <span>Revision Notes ({notes.length})</span>
            </h3>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-500">No notes generated yet for this source.</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-2 text-xs"
                  >
                    <h4 className="font-semibold text-white text-sm">{note.title}</h4>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
