import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Sparkles,
  Award,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { api } from '../../api';
import { AnalyticsData } from '../../types';

// Custom sleek tooltip for Recharts dual-axis line chart
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {data.formattedDate || label}
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded-full">
            {data.count} {data.count === 1 ? 'event' : 'events'}
          </span>
        </div>
        <div className="flex items-center justify-between text-indigo-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            Daily Study Time:
          </span>
          <span className="font-bold text-white font-mono">{data.studyMinutes} mins</span>
        </div>
        <div className="flex items-center justify-between text-emerald-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Content Mastery:
          </span>
          <span className="font-bold text-white font-mono">{data.mastery || 0}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Filter and process chart data based on selected window (30d default)
  const chartData = useMemo(() => {
    if (!analytics?.dailyActivity) return [];
    const limit = parseInt(timeRange, 10);
    return analytics.dailyActivity.slice(-limit).map(d => ({
      ...d,
      displayDate: d.formattedDate || d.date.slice(5),
    }));
  }, [analytics, timeRange]);

  // Aggregate stats for current selected window
  const windowStats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { totalMinutes: 0, avgMastery: 0, totalEvents: 0 };
    }
    const totalMinutes = chartData.reduce((acc, c) => acc + (c.studyMinutes || 0), 0);
    const totalEvents = chartData.reduce((acc, c) => acc + (c.count || 0), 0);
    const avgMastery = Math.round(
      chartData.reduce((acc, c) => acc + (c.mastery || 0), 0) / chartData.length
    );
    return { totalMinutes, avgMastery, totalEvents };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Study Performance & Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real metrics tracked across flashcard sessions, quiz assessments, and grounded tutor queries.
          </p>
        </div>

        {/* Global Quick Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Real-time Learning Telemetry</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900/70 to-slate-900/90 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span className="text-amber-200/90">Study Streak</span>
            <Flame className={`w-3.5 h-3.5 ${analytics?.metrics.hasStudiedToday ? 'fill-amber-400 text-amber-400' : 'text-amber-500'}`} />
          </span>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {analytics?.metrics.currentStreak || 0}
            <span className="text-xs font-sans text-amber-400 ml-1 font-normal">days</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {analytics?.metrics.longestStreak ? `Best: ${analytics.metrics.longestStreak} days` : 'Consecutive habit'}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Total Study Sessions</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </span>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">{analytics?.metrics.totalStudySessions || 0}</div>
          <p className="text-[11px] text-slate-500">Across all study modes</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Flashcards Reviewed</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">{analytics?.metrics.flashcardsReviewed || 0}</div>
          <p className="text-[11px] text-emerald-400">
            {analytics?.metrics.knownCardsCount || 0} cards mastered
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Average Quiz Accuracy</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {analytics?.metrics.averageQuizAccuracy ? `${analytics.metrics.averageQuizAccuracy}%` : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">
            {analytics?.metrics.quizzesCompleted || 0} completed exams
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Due for Spaced Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">{analytics?.metrics.dueCardsCount || 0}</div>
          <p className="text-[11px] text-slate-500">Scheduled for today</p>
        </div>
      </div>

      {/* 30-Day Recharts Line Chart: Study Time & Content Mastery */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Daily Study Time & Content Mastery
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-axis trend tracking daily focus minutes (left) and conceptual retention mastery percentage (right).
            </p>
          </div>

          {/* Timeframe Controls */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeRange === '30'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('14')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeRange === '14'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                timeRange === '7'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="px-4 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Period Focus Time
            </span>
            <span className="text-xs font-semibold text-white font-mono">
              {Math.floor(windowStats.totalMinutes / 60)}h {windowStats.totalMinutes % 60}m
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Window Avg Mastery
            </span>
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              {windowStats.avgMastery}%
            </span>
          </div>

          <div className="px-4 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              Recorded Sessions
            </span>
            <span className="text-xs font-semibold text-indigo-200 font-mono">
              {windowStats.totalEvents} study sessions
            </span>
          </div>
        </div>

        {/* Recharts Visualization */}
        <div className="h-72 sm:h-80 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No daily study activity recorded for this period yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={timeRange === '30' ? 3 : timeRange === '14' ? 1 : 0}
                />
                {/* Left Y-Axis: Daily Study Time (Minutes) */}
                <YAxis
                  yAxisId="left"
                  stroke="#818cf8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="m"
                />
                {/* Right Y-Axis: Content Mastery (%) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#34d399"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="studyMinutes"
                  name="Study Time (mins)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#a5b4fc' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mastery"
                  name="Content Mastery (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#6ee7b7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Practiced Topics & Recent Study Activity Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Practiced Topics (1 Col) */}
        <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Practiced Topics</span>
            </h3>
            <span className="text-xs text-slate-400">
              {analytics?.topicsPracticed?.length || 0} active
            </span>
          </div>

          {(!analytics?.topicsPracticed || analytics.topicsPracticed.length === 0) ? (
            <p className="text-xs text-slate-500 py-8 text-center">No topic data recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analytics.topicsPracticed.map((topic, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300 flex items-center gap-1.5 hover:border-slate-700 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recent Learning Activity Log (2 Cols) */}
        <div className="md:col-span-2 p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Recent Study Activity Log</span>
            </h3>
            <span className="text-xs text-slate-400">Chronological Telemetry</span>
          </div>

          {(!analytics?.recentActivity || analytics.recentActivity.length === 0) ? (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activity recorded.</p>
          ) : (
            <div className="space-y-2">
              {analytics.recentActivity.map(act => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs hover:border-slate-700/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" />
                    <span className="font-semibold text-white capitalize">
                      {act.activityType.replace('_', ' ')}
                    </span>
                    {act.metadata?.deckTitle && (
                      <span className="text-slate-400 truncate max-w-xs sm:max-w-sm">"{act.metadata.deckTitle}"</span>
                    )}
                    {act.metadata?.quizTitle && (
                      <span className="text-slate-400 truncate max-w-xs sm:max-w-sm">"{act.metadata.quizTitle}"</span>
                    )}
                    {act.metadata?.title && (
                      <span className="text-slate-400 truncate max-w-xs sm:max-w-sm">"{act.metadata.title}"</span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">
                    {new Date(act.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
