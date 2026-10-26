import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  Sparkles,
  Check,
  X as XIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../api';
import { Quiz, QuizQuestion, QuizAttempt, QuizResultItem } from '../../types';

interface QuizPlayerModalProps {
  quizId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  quizId,
  isOpen,
  onClose,
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Results State
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt | null>(null);
  const [resultsDetail, setResultsDetail] = useState<QuizResultItem[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.getQuiz(quizId, true);
      setQuiz(res.quiz);
      setQuestions(res.questions || []);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setFlagged({});
      setSubmittedAttempt(null);
      setResultsDetail(null);
      if (res.quiz.timerSeconds) {
        setTimeRemaining(res.quiz.timerSeconds);
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && quizId) {
      loadQuiz();
    }
  }, [isOpen, quizId]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || resultsDetail || timeRemaining === null || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resultsDetail, timeRemaining]);

  if (!isOpen) return null;

  const currentQ = questions[currentQuestionIndex];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (ans: string) => {
    if (resultsDetail || !currentQ) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: ans }));
  };

  const handleToggleFlag = () => {
    if (!currentQ) return;
    setFlagged(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleSubmit = async () => {
    if (submitting || !quiz) return;
    setSubmitting(true);
    try {
      const timeTaken = quiz.timerSeconds && timeRemaining !== null ? quiz.timerSeconds - timeRemaining : 60;
      const res = await api.submitQuiz(quiz.id, answers, timeTaken);
      setSubmittedAttempt(res.attempt);
      setResultsDetail(res.results);

      // Trigger celebratory confetti if passed with high score
      if (res.attempt.percentage >= 80) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="min-w-0 pr-4">
            <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              <span>{quiz?.title || 'Practice Exam'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Difficulty: <span className="capitalize text-slate-200">{quiz?.difficulty}</span> •{' '}
              {questions.length} Questions
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timeRemaining !== null && !resultsDetail && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{formatTimer(timeRemaining)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RESULTS SCREEN */}
        {resultsDetail && submittedAttempt ? (
          <div className="py-6 space-y-6">
            {/* Score Banner */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-xl font-extrabold font-mono">
                {submittedAttempt.percentage}%
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">
                  {submittedAttempt.percentage >= 80 ? 'Outstanding Comprehension!' : submittedAttempt.percentage >= 60 ? 'Solid Effort!' : 'Needs Focused Review'}
                </h4>
                <p className="text-xs text-slate-400">
                  You scored {submittedAttempt.score} out of {submittedAttempt.totalQuestions} questions correctly.
                </p>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Detailed Answer Breakdown & Source Citations
              </h4>

              <div className="space-y-3">
                {resultsDetail.map((res, i) => (
                  <div
                    key={res.questionId}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      res.isCorrect
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Question {i + 1}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${
                          res.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {res.isCorrect ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                        <span>{res.isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white">{res.questionText}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">Your Answer: </span>
                        <span className={res.isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                          {res.submittedAnswer || '(No answer provided)'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400">Correct Answer: </span>
                        <span className="text-emerald-300 font-semibold">{res.correctAnswer}</span>
                      </div>
                    </div>

                    {res.explanation && (
                      <div className="p-2.5 rounded-lg bg-slate-950/70 text-slate-300 border border-slate-800/80 space-y-1">
                        <p className="font-semibold text-indigo-300 text-[11px]">Explanation:</p>
                        <p className="leading-relaxed">{res.explanation}</p>
                        {res.sourceReference && (
                          <p className="text-[10px] text-slate-500 font-mono pt-1">
                            Reference: {res.sourceReference}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={loadQuiz}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Quiz</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* QUESTION TAKING VIEW */
          <div className="py-6 space-y-6">
            {/* Progress bar and flag */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-indigo-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  flagged[currentQ?.id]
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged[currentQ?.id] ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>

            {/* Question Card */}
            {currentQ && (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-5">
                <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
                  {currentQ.questionText}
                </h4>

                {/* Multiple Choice Options */}
                {currentQ.questionType === 'mcq' && currentQ.options && (
                  <div className="space-y-2">
                    {currentQ.options.map((option, idx) => {
                      const isSelected = answers[currentQ.id] === option;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAnswer(option)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/15 text-white font-medium shadow-md'
                              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{option}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-700'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* True or False */}
                {currentQ.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map(opt => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectAnswer(opt)}
                          className={`p-4 rounded-xl border text-center font-semibold text-sm transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-md'
                              : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Fill in the blank */}
                {currentQ.questionType === 'fill_blank' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Type your answer:</label>
                    <input
                      type="text"
                      value={answers[currentQ.id] || ''}
                      onChange={e => handleSelectAnswer(e.target.value)}
                      placeholder="Enter the missing term..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Short answer */}
                {currentQ.questionType === 'short_answer' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Your concise conceptual explanation:</label>
                    <textarea
                      rows={3}
                      value={answers[currentQ.id] || ''}
                      onChange={e => handleSelectAnswer(e.target.value)}
                      placeholder="Explain in 1-2 sentences..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Question Quick Jump Ribbon */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isFlag = Boolean(flagged[q.id]);
                const isCurrent = idx === currentQuestionIndex;

                let badgeColor = 'bg-slate-800 text-slate-400';
                if (isCurrent) badgeColor = 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400';
                else if (isFlag) badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
                else if (isAnswered) badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono flex items-center justify-center transition-all cursor-pointer ${badgeColor}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Navigation and Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Scoring...' : 'Submit Assessment'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
