import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import { Flashcard, AnalyticsData } from '../../types';
import { FlashcardStudyModal } from './FlashcardStudyModal';

export const RevisionView: React.FC = () => {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRevisionQueue = async () => {
    try {
      setLoading(true);
      const [dueRes, anRes] = await Promise.all([
        api.getDueCards(),
        api.getAnalytics().catch(() => null),
      ]);
      setDueCards(dueRes.dueCards || []);
      if (anRes) setAnalytics(anRes);
    } catch (err) {
      console.error('Failed to load revision queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisionQueue();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-amber-400" />
          <span>Daily Spaced Revision Queue</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Prioritized review queue of flashcards due today and concepts previously missed on assessments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Due Cards Queue (2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Flashcards Due For Review ({dueCards.length})
            </h3>
            {dueCards.length > 0 && (
              <button
                onClick={() => setActiveDeckId(dueCards[0].deckId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Review Session</span>
              </button>
            )}
          </div>

          {dueCards.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">All caught up!</p>
              <p className="text-xs text-slate-400">
                You have no flashcards scheduled for review right now. Great job keeping up with your intervals!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dueCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-amber-400 uppercase">
                      {card.reviewState === 'needs_review' ? 'Needs Review' : 'Interval Due'}
                    </span>
                    <span>Level {card.repetitionLevel}/5</span>
                  </div>
                  <p className="font-semibold text-white text-sm">{card.front}</p>
                  <p className="text-slate-400 text-xs line-clamp-1">{card.back}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missed Concepts & Focus Areas (1 Col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Frequently Missed Quiz Concepts
          </h3>

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
            {(!analytics?.missedConcepts || analytics.missedConcepts.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No recurring knowledge gaps recorded. Take more assessments to pinpoint weak spots.
              </p>
            ) : (
              analytics.missedConcepts.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-300">{item.topic}</span>
                    {item.sourceReference && (
                      <span className="text-[10px] text-slate-500 font-mono">{item.sourceReference}</span>
                    )}
                  </div>
                  <p className="text-slate-300 line-clamp-2 leading-relaxed">{item.question}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {activeDeckId && (
        <FlashcardStudyModal
          deckId={activeDeckId}
          isOpen={Boolean(activeDeckId)}
          onClose={() => {
            setActiveDeckId(null);
            loadRevisionQueue();
          }}
        />
      )}
    </div>
  );
};
