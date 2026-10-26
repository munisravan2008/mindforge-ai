import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Play,
  RotateCw,
  Search,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import { FlashcardDeck } from '../../types';
import { FlashcardStudyModal } from './FlashcardStudyModal';

interface FlashcardsViewProps {
  onOpenUpload: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ onOpenUpload }) => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Create manual deck state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadDecks = async () => {
    try {
      setLoading(true);
      const res = await api.getFlashcardDecks();
      setDecks(res.decks || []);
    } catch (err) {
      console.error('Failed to load flashcard decks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDeleteDeck = async (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this flashcard deck and its cards?')) return;
    try {
      await api.deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.id !== deckId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete deck');
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.generateFlashcards({
        count: 5,
        difficulty: 'medium',
      });
      // reload
      await loadDecks();
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create deck');
    }
  };

  const filteredDecks = decks.filter(d => {
    if (!searchQuery.trim()) return true;
    return (
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>AI Flashcard Decks</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Active recall and 5-tier spaced repetition decks generated from your study materials.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate from Document</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search flashcard decks..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No Flashcard Decks</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a source document or lecture video to automatically generate a complete study deck.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create First Deck</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDecks.map(deck => {
            const total = deck.totalCards || 0;
            const known = deck.knownCount || 0;
            const review = deck.reviewCount || 0;
            const masteryPercent = total > 0 ? Math.round((known / total) * 100) : 0;

            return (
              <div
                key={deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-4 group cursor-pointer shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {total} Cards
                    </span>
                    <button
                      onClick={(e) => handleDeleteDeck(e, deck.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete deck"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {deck.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {deck.description || 'Active recall study deck generated from course source.'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Mastery Progress</span>
                      <span className="font-semibold text-emerald-400">{masteryPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${masteryPercent}%` }} />
                      <div className="bg-amber-500 h-full" style={{ width: `${total > 0 ? (review / total) * 100 : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span className="text-emerald-400">{known} Known</span>
                      <span className="text-amber-400">{review} Needs Review</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{new Date(deck.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold group-hover:text-indigo-300">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Study Deck</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Study Modal */}
      {selectedDeckId && (
        <FlashcardStudyModal
          deckId={selectedDeckId}
          isOpen={Boolean(selectedDeckId)}
          onClose={() => {
            setSelectedDeckId(null);
            loadDecks();
          }}
        />
      )}
    </div>
  );
};
