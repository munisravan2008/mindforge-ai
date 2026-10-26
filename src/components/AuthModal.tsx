import React, { useState } from 'react';
import { X, Sparkles, Brain, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'onboarding'>(initialMode);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [learningGoal, setLearningGoal] = useState('college');
  const [studyMethods, setStudyMethods] = useState<string[]>(['flashcards', 'quizzes', 'tutor']);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setMode('onboarding');
  };

  const completeRegistration = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await register({
        name,
        email,
        password,
        preferredLanguage,
        learningGoal,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
      setMode('signup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await demoLogin();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMethod = (method: string) => {
    setStudyMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-600/30">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {mode === 'login' && 'Sign in to MindForge AI'}
            {mode === 'signup' && 'Create your MindForge Account'}
            {mode === 'onboarding' && 'Personalize Your Study System'}
          </h3>
          <p className="text-xs text-slate-400">
            {mode === 'login' && 'Access your uploaded notes, saved flashcards, and tutor history.'}
            {mode === 'signup' && 'Start organizing and mastering your study materials with AI.'}
            {mode === 'onboarding' && 'Tune your AI generation preferences in a few clicks.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Or For Evaluators</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Instant Hackathon Judge Demo Login</span>
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signup');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP MODE */}
        {mode === 'signup' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 6 chars)</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next: Set Learning Goals</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ONBOARDING FLOW */}
        {mode === 'onboarding' && (
          <div className="space-y-4">
            {/* Step 1: Language */}
            {onboardingStep === 1 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Step 1 of 3: Preferred Language
                </p>
                <p className="text-sm text-slate-300">
                  Choose the primary language for AI-generated notes, flashcards, and tutor answers.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    'English',
                    'Spanish',
                    'French',
                    'German',
                    'Chinese',
                    'Japanese',
                    'Hindi',
                    'Portuguese',
                  ].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreferredLanguage(lang)}
                      className={`p-3 rounded-xl border text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                        preferredLanguage === lang
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{lang}</span>
                      {preferredLanguage === lang && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Goal */}
            {onboardingStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Step 2 of 3: Learning Goal
                </p>
                <p className="text-sm text-slate-300">What is your primary study objective right now?</p>
                <div className="space-y-2 pt-1">
                  {[
                    { id: 'college', title: 'College & University Studies', desc: 'Semester courses, midterms, and finals.' },
                    { id: 'exam_prep', title: 'Standardized Exam Prep', desc: 'MCAT, USMLE, Bar Exam, GRE, SAT, etc.' },
                    { id: 'competitive_exams', title: 'Competitive Entrance Exams', desc: 'National recruitment and technical challenges.' },
                    { id: 'professional', title: 'Professional Upskilling', desc: 'Industry certifications and technical books.' },
                    { id: 'general', title: 'Self-Directed Knowledge', desc: 'Exploring scientific papers, history, and literature.' },
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setLearningGoal(g.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        learningGoal === g.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{g.title}</p>
                        <p className="text-[11px] text-slate-400">{g.desc}</p>
                      </div>
                      {learningGoal === g.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Methods & Finish */}
            {onboardingStep === 3 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Step 3 of 3: Preferred Study Tools
                </p>
                <p className="text-sm text-slate-300">Choose the study formats you want MindForge to prioritize:</p>
                <div className="space-y-2 pt-1">
                  {[
                    { id: 'flashcards', label: 'Flashcards & Spaced Repetition' },
                    { id: 'quizzes', label: 'Practice Exams & MCQ Quizzes' },
                    { id: 'summaries', label: 'Chapter Summaries & Cram Sheets' },
                    { id: 'tutor', label: 'Conversational Source Tutor' },
                  ].map(m => {
                    const checked = studyMethods.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMethod(m.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          checked
                            ? 'border-indigo-500 bg-indigo-500/15 text-white'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{m.label}</span>
                        {checked && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={completeRegistration}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{submitting ? 'Setting Up...' : 'Launch Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
