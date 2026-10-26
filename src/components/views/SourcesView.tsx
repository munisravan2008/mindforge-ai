import React, { useEffect, useState } from 'react';
import {
  Files,
  FileText,
  Video,
  FileCode,
  Search,
  Upload,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import { Source } from '../../types';

interface SourcesViewProps {
  onSelectSource: (sourceId: string) => void;
  onOpenUpload: () => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  onSelectSource,
  onOpenUpload,
}) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSources = async () => {
    try {
      setLoading(true);
      const res = await api.getSources();
      setSources(res.sources || []);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleDelete = async (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this study source and all derived chunks?')) {
      return;
    }
    try {
      await api.deleteSource(sourceId);
      setSources(prev => prev.filter(s => s.id !== sourceId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete source');
    }
  };

  const filteredSources = sources.filter(s => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.summary && s.summary.toLowerCase().includes(q)) ||
        (s.topicOutline && s.topicOutline.some(t => t.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Files className="w-6 h-6 text-indigo-400" />
            <span>My Study Sources</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ingested textbooks, research papers, lecture notes, and video transcripts.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Import New Material</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search titles, topics, or concepts..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Format Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'youtube', label: 'Videos' },
            { id: 'notes', label: 'Notes' },
            { id: 'docx', label: 'DOCX' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                filterType === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Grid / List */}
      {filteredSources.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <Files className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No sources found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search terms or filter.'
                : 'Upload your first study document to generate flashcards and quizzes.'}
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSources.map(source => (
            <div
              key={source.id}
              onClick={() => onSelectSource(source.id)}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between space-y-4 group cursor-pointer shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 uppercase">
                    {source.type === 'youtube' && <Video className="w-3.5 h-3.5 text-violet-400" />}
                    {source.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                    {source.type === 'docx' && <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                    {source.type === 'notes' && <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="font-semibold text-slate-300">{source.type}</span>
                  </div>

                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(source.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {source.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {source.summary || 'Processing completed. Ready for learning resource generation.'}
                  </p>
                </div>

                {source.topicOutline && source.topicOutline.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 truncate">
                    {source.topicOutline.slice(0, 3).map((topic, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span aria-hidden="true" className="text-slate-600">·</span>}
                        <span className="truncate max-w-[120px]">{topic}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span>{source.chunkCount} chunks</span>
                  <span>•</span>
                  <span>{source.wordCount} words</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, source.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
