import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  Play,
  RotateCw,
  Search,
  Sparkles,
  Trophy,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../../api';
import { Quiz } from '../../types';
import { QuizPlayerModal } from './QuizPlayerModal';

interface QuizzesViewProps {
  onOpenUpload: () => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({ onOpenUpload }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const res = await api.getQuizzes();
      setQuizzes(res.quizzes || []);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter(q => {
    if (!searchQuery.trim()) return true;
    return q.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-400" />
            <span>Practice Quizzes & Assessments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Server-scored assessments with detailed explanations and verifiable source citations.
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
          placeholder="Search quizzes..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Quizzes List */}
      {filteredQuizzes.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-4">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No practice quizzes yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a source document and generate an assessment with MCQ, True/False, and short-answer questions.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create First Quiz</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map(quiz => (
            <div
              key={quiz.id}
              onClick={() => setSelectedQuizId(quiz.id)}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-4 group cursor-pointer shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded capitalize bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {quiz.difficulty} Level
                  </span>

                  {quiz.bestScore !== null && quiz.bestScore !== undefined && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400 font-mono">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{quiz.bestScore}% Best</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{quiz.questionCount || 5} Questions</span>
                    <span>•</span>
                    <span>{quiz.attemptsCount || 0} Attempts</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold group-hover:text-emerald-300">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Take Quiz</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {selectedQuizId && (
        <QuizPlayerModal
          quizId={selectedQuizId}
          isOpen={Boolean(selectedQuizId)}
          onClose={() => {
            setSelectedQuizId(null);
            loadQuizzes();
          }}
        />
      )}
    </div>
  );
};
