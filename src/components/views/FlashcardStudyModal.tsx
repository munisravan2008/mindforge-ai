import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCw,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Download,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../../api';
import { FlashcardDeck, Flashcard } from '../../types';

interface FlashcardStudyModalProps {
  deckId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FlashcardStudyModal: React.FC<FlashcardStudyModalProps> = ({
  deckId,
  isOpen,
  onClose,
}) => {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // New / Edit Card state
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [frontInput, setFrontInput] = useState('');
  const [backInput, setBackInput] = useState('');
  const [explanationInput, setExplanationInput] = useState('');

  // Study timer tracking
  const startTimeRef = useRef<number>(Date.now());

  const loadDeck = async () => {
    try {
      setLoading(true);
      const res = await api.getFlashcardDeck(deckId);
      setDeck(res.deck);
      setCards(res.cards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      startTimeRef.current = Date.now();
    } catch (err) {
      console.error('Failed to load deck:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && deckId) {
      loadDeck();
    }
    return () => {
      // Clean up TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, deckId]);

  // Log study session on close
  const handleClose = async () => {
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (elapsedSeconds >= 10) {
      try {
        await api.logStudySession('flashcard_review', elapsedSeconds, { deckId });
      } catch (err) {
        console.error('Failed to log study session:', err);
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  // Keyboard Navigation: Space to flip, Arrows to navigate, 1 & 2 for recall rating
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || showAddCard || editingCard) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        handleReview('needs_review');
      } else if (e.key === '2') {
        handleReview('known');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, cards.length, showAddCard, editingCard]);

  if (!isOpen) return null;

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((currentIndex + 1) % cards.length);
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((currentIndex - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleReview = async (outcome: 'known' | 'needs_review') => {
    if (!currentCard) return;
    try {
      const res = await api.reviewCard(currentCard.id, outcome);
      setCards(prev => prev.map(c => (c.id === currentCard.id ? res.card : c)));
      handleNext();
    } catch (err) {
      console.error('Review record error:', err);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;

    try {
      if (editingCard) {
        const res = await api.updateCard(editingCard.id, {
          front: frontInput.trim(),
          back: backInput.trim(),
          explanation: explanationInput.trim(),
        });
        setCards(prev => prev.map(c => (c.id === editingCard.id ? res.card : c)));
        setEditingCard(null);
      } else {
        const res = await api.addCard(deckId, {
          front: frontInput.trim(),
          back: backInput.trim(),
          explanation: explanationInput.trim(),
        });
        setCards(prev => [...prev, res.card]);
        setShowAddCard(false);
      }
      setFrontInput('');
      setBackInput('');
      setExplanationInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to save card');
    }
  };

  const handleDeleteCard = async () => {
    if (!currentCard) return;
    if (!window.confirm('Delete this flashcard?')) return;
    try {
      await api.deleteCard(currentCard.id);
      const remaining = cards.filter(c => c.id !== currentCard.id);
      setCards(remaining);
      if (currentIndex >= remaining.length) {
        setCurrentIndex(Math.max(0, remaining.length - 1));
      }
      setIsFlipped(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete card');
    }
  };

  const exportCsv = () => {
    if (cards.length === 0) return;
    const rows = [
      ['Question', 'Answer', 'Explanation', 'Page / Reference'],
      ...cards.map(c => [
        `"${c.front.replace(/"/g, '""')}"`,
        `"${c.back.replace(/"/g, '""')}"`,
        `"${(c.explanation || '').replace(/"/g, '""')}"`,
        `"${(c.sourceReference || '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(deck?.title || 'deck').replace(/\s+/g, '_')}_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const knownCount = cards.filter(c => c.reviewState === 'known').length;
  const reviewCount = cards.filter(c => c.reviewState === 'needs_review').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          focusMode ? 'max-w-4xl min-h-[660px]' : 'max-w-2xl min-h-[560px]'
        } rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>{deck?.title || 'Flashcards'}</span>
            </h3>
            {/* Zero-Pill Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
              <span className="tabular-nums">
                Card {cards.length > 0 ? currentIndex + 1 : 0} of {cards.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 tabular-nums">{knownCount} Mastered</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 tabular-nums">{reviewCount} Needs Review</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFocusMode(!focusMode)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={focusMode ? 'Exit Zen Mode' : 'Enter Zen Focus Mode'}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShuffle}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Shuffle Cards"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={exportCsv}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Export as CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Card Study Body */}
        {cards.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">This deck has no flashcards yet.</p>
            <button
              onClick={() => setShowAddCard(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
            >
              Add First Card
            </button>
          </div>
        ) : (
          <div className="py-6 flex-1 flex flex-col justify-center">
            {/* 3D Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-full ${
                focusMode ? 'h-80 sm:h-96' : 'h-72 sm:h-80'
              } cursor-pointer select-none perspective-1000 group`}
            >
              <div
                className={`w-full h-full duration-500 transform-style-3d transition-transform rounded-3xl border ${
                  isFlipped
                    ? 'rotate-y-180 border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 to-slate-900 shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/90 group-hover:border-slate-700'
                } p-6 sm:p-8 flex flex-col justify-between shadow-2xl`}
              >
                {/* Front Side */}
                <div className={`space-y-4 ${isFlipped ? 'hidden' : 'block'}`}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-indigo-400 font-mono">
                      Question Prompt
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (currentCard) handleSpeak(currentCard.front);
                        }}
                        className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                        title="Read question aloud"
                      >
                        {isSpeaking ? (
                          <VolumeX className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-[11px] text-slate-500">Spacebar to flip ↻</span>
                    </div>
                  </div>
                  <p className="text-lg sm:text-2xl font-semibold text-slate-100 leading-snug">
                    {currentCard?.front}
                  </p>
                </div>

                {/* Back Side */}
                <div className={`space-y-4 ${isFlipped ? 'block' : 'hidden'} rotate-y-180`}>
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                      Target Answer
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (currentCard) handleSpeak(currentCard.back);
                        }}
                        className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                        title="Read answer aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      {currentCard?.pageNumber && (
                        <span className="font-mono text-[11px] text-slate-400">
                          Source: Page {currentCard.pageNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-base sm:text-xl font-medium text-slate-100 leading-relaxed">
                      {currentCard?.back}
                    </p>
                    {currentCard?.explanation && (
                      <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                        {currentCard.explanation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer on Card */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>
                    Level {currentCard?.repetitionLevel || 0}/5 ·{' '}
                    {currentCard?.reviewState === 'known'
                      ? 'Mastered'
                      : currentCard?.reviewState === 'needs_review'
                      ? 'Needs Review'
                      : 'New Item'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingCard(currentCard);
                        setFrontInput(currentCard.front);
                        setBackInput(currentCard.back);
                        setExplanationInput(currentCard.explanation || '');
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300"
                      title="Edit Card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteCard();
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Action Controls */}
        <div className="space-y-4 pt-2">
          {/* Spaced repetition review buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleReview('needs_review')}
              className="py-3 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Needs Review (Key 1)</span>
            </button>
            <button
              onClick={() => handleReview('known')}
              className="py-3 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Know This (Key 2)</span>
            </button>
          </div>

          {/* Stepper and Add Card */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => {
                setEditingCard(null);
                setFrontInput('');
                setBackInput('');
                setExplanationInput('');
                setShowAddCard(true);
              }}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Flashcard</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal for adding/editing card */}
        {(showAddCard || editingCard) && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 flex flex-col justify-between z-20 animate-in fade-in duration-150">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white">
                  {editingCard ? 'Edit Flashcard' : 'Add New Flashcard'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddCard(false);
                    setEditingCard(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCard} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Front (Question)</label>
                  <textarea
                    value={frontInput}
                    onChange={e => setFrontInput(e.target.value)}
                    required
                    rows={3}
                    placeholder="e.g. What is the role of ATP Synthase?"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Back (Answer)</label>
                  <textarea
                    value={backInput}
                    onChange={e => setBackInput(e.target.value)}
                    required
                    rows={3}
                    placeholder="e.g. Uses proton motive force to synthesize ATP from ADP and Pi."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Explanation / Page Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={explanationInput}
                    onChange={e => setExplanationInput(e.target.value)}
                    placeholder="e.g. Chapter 4, Page 42"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCard(false);
                      setEditingCard(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                  >
                    Save Flashcard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
