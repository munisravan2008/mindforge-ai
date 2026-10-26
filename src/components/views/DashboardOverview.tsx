import React, { useEffect, useState, useMemo } from 'react';
import {
  Upload,
  BookOpen,
  HelpCircle,
  Brain,
  Video,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RotateCw,
  Download,
  Flame,
  Check,
  Trophy,
  Zap,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Source, AnalyticsData, FlashcardDeck, Quiz } from '../../types';
import { AppTab } from '../Sidebar';

interface DashboardOverviewProps {
  onSelectTab: (tab: AppTab) => void;
  onOpenUpload: () => void;
  onSelectSource: (sourceId: string) => void;
  onSelectDeck: (deckId: string) => void;
  onSelectQuiz: (quizId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onSelectTab,
  onOpenUpload,
  onSelectSource,
  onSelectDeck,
  onSelectQuiz,
}) => {
  const { user } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [loggingQuickStudy, setLoggingQuickStudy] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [srcRes, deckRes, quizRes, anRes] = await Promise.all([
        api.getSources(),
        api.getFlashcardDecks(),
        api.getQuizzes(),
        api.getAnalytics().catch(() => null),
      ]);
      setSources(srcRes.sources || []);
      setDecks(deckRes.decks || []);
      setQuizzes(quizRes.quizzes || []);
      if (anRes) setAnalytics(anRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalSources = sources.length;
  const recentSources = sources.slice(0, 4);

  // Compute weekly study minutes
  const totalStudyMinutes = Number.isFinite(
    (analytics?.dailyActivity || []).reduce((acc, d) => acc + (Number(d.studyMinutes) || 0), 0)
  )
    ? (analytics?.dailyActivity || []).reduce((acc, d) => acc + (Number(d.studyMinutes) || 0), 0) || 45
    : 45;
  const weeklyGoalMinutes = 120;
  const rawGoal = Math.round((totalStudyMinutes / weeklyGoalMinutes) * 100);
  const goalPercentage = Number.isFinite(rawGoal) ? Math.min(Math.max(rawGoal, 0), 100) : 0;

  // Resilient streak and habit calculation
  const streakData = useMemo(() => {
    if (analytics?.streakInfo) {
      return analytics.streakInfo;
    }

    const daily = analytics?.dailyActivity || [];
    if (daily.length === 0) {
      return {
        currentStreak: analytics?.metrics.currentStreak || 0,
        longestStreak: analytics?.metrics.longestStreak || 0,
        hasStudiedToday: analytics?.metrics.hasStudiedToday || false,
        nextMilestone: 3,
        daysToMilestone: 3,
        weekDays: [],
      };
    }

    const todayEntry = daily[daily.length - 1];
    const yesterdayEntry = daily[daily.length - 2];
    const hasToday = (todayEntry?.count || 0) > 0;
    const hasYesterday = (yesterdayEntry?.count || 0) > 0;

    let cur = 0;
    if (hasToday) {
      cur = 1;
      for (let k = daily.length - 2; k >= 0; k--) {
        if (daily[k].count > 0) cur++;
        else break;
      }
    } else if (hasYesterday) {
      cur = 1;
      for (let k = daily.length - 3; k >= 0; k--) {
        if (daily[k].count > 0) cur++;
        else break;
      }
    }

    let maxS = 0;
    let run = 0;
    for (const d of daily) {
      if (d.count > 0) {
        run++;
        if (run > maxS) maxS = run;
      } else {
        run = 0;
      }
    }
    maxS = Math.max(maxS, cur);

    const milestones = [3, 7, 14, 21, 30, 50, 100];
    const nextM = milestones.find(m => m > cur) || (cur + 7);

    const week = daily.slice(-7).map((d, idx) => {
      const dateObj = new Date(d.date + 'T12:00:00Z');
      return {
        date: d.date,
        formattedDate: d.formattedDate,
        dayLabel: dateObj.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: idx === 6,
        hasStudied: d.count > 0,
        count: d.count,
        studyMinutes: d.studyMinutes,
      };
    });

    return {
      currentStreak: analytics?.metrics.currentStreak ?? cur,
      longestStreak: analytics?.metrics.longestStreak ?? maxS,
      hasStudiedToday: analytics?.metrics.hasStudiedToday ?? hasToday,
      nextMilestone: nextM,
      daysToMilestone: Math.max(1, nextM - cur),
      weekDays: week,
    };
  }, [analytics]);

  const handleLogQuickStudy = async () => {
    try {
      setLoggingQuickStudy(true);
      await api.logStudySession('flashcard_review', 900, { notes: 'Daily streak focus session' });
      try {
        confetti({
          particleCount: 55,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#f59e0b', '#fbbf24', '#f97316', '#6366f1', '#10b981'],
        });
      } catch {
        // decorative
      }
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to log quick study session:', err);
    } finally {
      setLoggingQuickStudy(false);
    }
  };

  const handleExportDossier = async (e: React.MouseEvent, sourceId: string, title: string) => {
    e.stopPropagation();
    try {
      setExportingId(sourceId);
      const mdContent = await api.exportSourceGuide(sourceId);
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Study_Dossier.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Editorial Header Banner (Zero-Pill Compliance) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="text-xs font-mono text-slate-400 flex flex-wrap items-center gap-2">
            <span>MindForge Active Recall Cockpit</span>
            <span aria-hidden="true">·</span>
            <span>Spaced Repetition & Assessed Quizzes</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-400">Gemini 3.8 Flash</span>
            {streakData.currentStreak > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                  streakData.hasStudiedToday
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    : 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
                }`}>
                  <Flame className={`w-3.5 h-3.5 ${streakData.hasStudiedToday ? 'fill-amber-400 text-amber-400 animate-pulse' : 'text-orange-400'}`} />
                  <span>{streakData.currentStreak} Day Streak</span>
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
            Welcome back, {user?.name || 'Scholar'}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed [text-wrap:balance]">
            Ingest study PDFs, lecture notes, or video transcripts to extract verified concepts,
            drill with spaced-repetition flashcards, and test comprehension against cited sources.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Add Study Material</span>
            </button>
            <button
              onClick={() => onSelectTab('tutor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer border border-slate-700"
            >
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Ask Grounded Tutor</span>
            </button>
            {!streakData.hasStudiedToday && (
              <button
                onClick={handleLogQuickStudy}
                disabled={loggingQuickStudy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold text-xs transition-all cursor-pointer border border-amber-500/40"
                title="Log a 15-minute study focus session to maintain your streak"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{loggingQuickStudy ? 'Logging session...' : 'Log 15m Focus'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient mesh background accent */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary Metrics Grid (Tabular Numerals + Study Streak) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Metric 1: Study Streak */}
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900/70 to-slate-900/90 space-y-1 relative overflow-hidden group shadow-md shadow-amber-950/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-amber-200/90">Study Streak</span>
            <div className={`p-1.5 rounded-lg ${streakData.hasStudiedToday ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <Flame className={`w-4 h-4 ${streakData.hasStudiedToday ? 'fill-amber-400 text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums flex items-baseline gap-1.5">
            <span>{streakData.currentStreak}</span>
            <span className="text-xs font-sans text-amber-400 font-medium">
              {streakData.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <p className="text-[11px] font-mono flex items-center gap-1 truncate text-slate-400">
            {streakData.hasStudiedToday ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Active today
              </span>
            ) : streakData.currentStreak > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0" /> Action needed today
              </span>
            ) : (
              <span>Start streak today</span>
            )}
          </p>
        </div>

        {/* Metric 2: Ingested Sources */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ingested Sources</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">{totalSources}</div>
          <p className="text-[11px] text-slate-400 font-mono">PDFs, Videos & Notes</p>
        </div>

        {/* Metric 3: Cards Reviewed */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cards Reviewed</span>
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {analytics?.metrics.flashcardsReviewed || 0}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {analytics?.metrics.knownCardsCount || 0} mastered cards
          </p>
        </div>

        {/* Metric 4: Quiz Accuracy */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Quiz Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {analytics?.metrics.averageQuizAccuracy
              ? `${analytics.metrics.averageQuizAccuracy}%`
              : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {analytics?.metrics.quizzesCompleted || 0} assessments
          </p>
        </div>

        {/* Metric 5: Due for Recall */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Due for Recall</span>
            <RotateCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {analytics?.metrics.dueCardsCount || 0}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Spaced repetition queue</p>
        </div>
      </div>

      {/* Main Content Layout: Recent Sources (2 Cols) + Streak & Focus Habit (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Study Sources */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Study Materials
            </h3>
            <button
              onClick={() => onSelectTab('sources')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Sources ({sources.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSources.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-900/30">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No study sources uploaded yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a PDF textbook, lecture notes, or YouTube video to begin.
              </p>
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Source</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSources.map(source => (
                <div
                  key={source.id}
                  onClick={() => onSelectSource(source.id)}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      {source.type === 'youtube' ? (
                        <Video className="w-5 h-5 text-violet-400" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {source.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        <span>{source.chunkCount} sections</span>
                        <span aria-hidden="true"> · </span>
                        <span>{source.wordCount} words</span>
                        <span aria-hidden="true"> · </span>
                        <span>{new Date(source.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => handleExportDossier(e, source.id, source.title)}
                      disabled={exportingId === source.id}
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
                      title="Download Markdown Study Dossier"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span>{exportingId === source.id ? 'Exporting...' : 'Export Dossier'}</span>
                    </button>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Prominent Study Streak Habit Engine & Weekly Goal */}
        <div className="space-y-6">
          {/* Dedicated Study Streak Counter Card */}
          <div className="p-6 rounded-3xl border border-amber-500/25 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/95 space-y-5 shadow-xl relative overflow-hidden">
            {/* Subtle warm glow backdrop */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Streak Card Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Flame className={`w-4 h-4 ${streakData.hasStudiedToday ? 'fill-amber-400' : ''}`} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Study Streak & Habit
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-slate-300">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Best: {streakData.longestStreak}d</span>
              </div>
            </div>

            {/* Main Streak Counter Display */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/30">
                <Flame className={`w-9 h-9 text-amber-400 ${streakData.hasStudiedToday ? 'fill-amber-400 animate-pulse' : 'opacity-90'}`} />
                {streakData.hasStudiedToday && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  {streakData.currentStreak}{' '}
                  <span className="text-base font-sans font-semibold text-amber-400">
                    {streakData.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {streakData.hasStudiedToday
                    ? 'Streak active today! Great momentum.'
                    : streakData.currentStreak > 0
                    ? 'Study today to keep your fire burning!'
                    : 'Ignite your streak with your first session!'}
                </p>
              </div>
            </div>

            {/* 7-Day Habit Tracker Timeline */}
            <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium">Past 7 Days Consistency</span>
                <span className="font-mono text-[11px] text-amber-400">
                  {streakData.weekDays.filter(d => d.hasStudied).length}/7 days active
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {streakData.weekDays.map((day, idx) => {
                  const dayNum = day.date ? new Date(day.date + 'T12:00:00Z').getDate() : idx + 1;
                  return (
                    <div
                      key={day.date || idx}
                      className="flex flex-col items-center gap-1.5"
                      title={`${day.formattedDate || day.date}: ${day.hasStudied ? `${day.count} activities (${day.studyMinutes}m)` : 'Rest day'}`}
                    >
                      <div
                        className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${
                          day.hasStudied
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
                            : day.isToday
                            ? 'bg-slate-800/80 border-amber-500/60 text-slate-200 ring-2 ring-amber-500/30 animate-pulse'
                            : 'bg-slate-900/80 border-slate-800 text-slate-500'
                        }`}
                      >
                        {day.hasStudied ? (
                          <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ) : day.isToday ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        )}
                        <span className="text-[10px] font-mono font-semibold tabular-nums mt-0.5">
                          {dayNum}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${day.isToday ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                        {day.dayLabel || day.dayName?.slice(0, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak Milestone Progress */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Next Milestone</span>
                </span>
                <span className="font-mono text-slate-300 text-xs">
                  {streakData.nextMilestone} Days ({streakData.daysToMilestone}d to go)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(10, Math.round((streakData.currentStreak / streakData.nextMilestone) * 100)))}%`,
                  }}
                />
              </div>
            </div>

            {/* Motivational Action & Quick Focus Trigger */}
            <div className="pt-2">
              {!streakData.hasStudiedToday ? (
                <div className="space-y-2">
                  <button
                    onClick={handleLogQuickStudy}
                    disabled={loggingQuickStudy}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-600/25"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>{loggingQuickStudy ? 'Logging Focus Session...' : 'Log 15m Focus Session (+Streak)'}</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectTab('revision')}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Review Cards</span>
                    </button>
                    <button
                      onClick={() => onSelectTab('quizzes')}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Take Quiz</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Daily streak protected for today!</span>
                  </div>
                  <button
                    onClick={handleLogQuickStudy}
                    disabled={loggingQuickStudy}
                    className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    +15m Extra
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Focus Goal & Spaced Repetition Container */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Weekly Study Velocity
              </h3>
              <span className="text-xs text-indigo-400 font-mono">120m Target</span>
            </div>

            {/* Radial Goal Ring */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  {/* Track */}
                  <path
                    className="text-slate-800"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress fill */}
                  <path
                    className="text-indigo-500 transition-all duration-700 ease-out"
                    strokeDasharray={`${goalPercentage}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-sm font-bold text-white font-mono tabular-nums">
                    {goalPercentage}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Focus Time Logged</h4>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  {totalStudyMinutes} / {weeklyGoalMinutes} minutes logged
                </p>
                <p className="text-[11px] text-slate-500">
                  {goalPercentage >= 100
                    ? 'Goal reached for this cycle'
                    : `${weeklyGoalMinutes - totalStudyMinutes}m left to target`}
                </p>
              </div>
            </div>

            {/* Spaced Repetition Due Card Action */}
            <div className="pt-1 space-y-2">
              <button
                onClick={() => onSelectTab('revision')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Review Due Cards ({analytics?.metrics.dueCardsCount || 0})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
