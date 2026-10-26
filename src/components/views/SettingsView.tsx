import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Globe,
  Sliders,
  Shield,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export const SettingsView: React.FC = () => {
  const { user, preferences, updatePreferences, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(preferences?.preferredLanguage || 'English');
  const [learningGoal, setLearningGoal] = useState(preferences?.learningGoal || 'college');
  const [defaultDifficulty, setDefaultDifficulty] = useState(preferences?.defaultDifficulty || 'medium');
  const [defaultQuizQuestionCount, setDefaultQuizQuestionCount] = useState<number | string>(() => {
    const cnt = Number(preferences?.defaultQuizQuestionCount);
    return Number.isFinite(cnt) && cnt > 0 ? cnt : 5;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state when preferences/user loads asynchronously
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    if (preferences) {
      if (preferences.preferredLanguage) setPreferredLanguage(preferences.preferredLanguage);
      if (preferences.learningGoal) setLearningGoal(preferences.learningGoal);
      if (preferences.defaultDifficulty) setDefaultDifficulty(preferences.defaultDifficulty);
      const cnt = Number(preferences.defaultQuizQuestionCount);
      if (Number.isFinite(cnt) && cnt > 0) {
        setDefaultQuizQuestionCount(cnt);
      }
    }
  }, [preferences]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (name.trim() !== user?.name) {
        await updateProfile({ name: name.trim() });
      }
      const safeCount = typeof defaultQuizQuestionCount === 'number' && Number.isFinite(defaultQuizQuestionCount)
        ? Math.max(3, Math.min(20, defaultQuizQuestionCount))
        : 5;
      await updatePreferences({
        preferredLanguage,
        learningGoal,
        defaultDifficulty,
        defaultQuizQuestionCount: safeCount,
      });
      setDefaultQuizQuestionCount(safeCount);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('CRITICAL WARNING: This will permanently delete your account and all uploaded study documents, flashcards, quizzes, and tutor histories. Continue?')) {
      return;
    }
    try {
      await api.deleteAccount();
      logout();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Account & Study Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Personalize your AI study generation defaults and account profile.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <span>Profile Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950/50 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Learning Generation Preferences */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" />
            <span>AI Generation Defaults</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={e => setPreferredLanguage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Hindi', 'Portuguese'].map(lang => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Primary Learning Goal</label>
              <select
                value={learningGoal}
                onChange={e => setLearningGoal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="college">College & University</option>
                <option value="exam_prep">Standardized Exam Prep</option>
                <option value="competitive_exams">Competitive Exams</option>
                <option value="professional">Professional Upskilling</option>
                <option value="general">Self-Directed Learning</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Quiz Difficulty</label>
              <select
                value={defaultDifficulty}
                onChange={e => setDefaultDifficulty(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Question Count</label>
              <input
                type="number"
                min={3}
                max={20}
                value={
                  defaultQuizQuestionCount === '' || !Number.isFinite(Number(defaultQuizQuestionCount))
                    ? ''
                    : defaultQuizQuestionCount
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setDefaultQuizQuestionCount('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setDefaultQuizQuestionCount(Number.isFinite(parsed) ? parsed : '');
                  }
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences updated successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-4">
        <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Permanently delete your account, private study uploads, and derived flashcards. This action cannot be reversed.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
        >
          Delete Account & All Materials
        </button>
      </div>
    </div>
  );
};
