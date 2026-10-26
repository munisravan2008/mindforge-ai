import React, { useEffect, useState } from 'react';
import {
  BookCheck,
  Search,
  Copy,
  Download,
  Trash2,
  Edit3,
  Check,
  Save,
  FileText,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import { StudyNote } from '../../types';

interface NotesViewProps {
  onOpenUpload: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onOpenUpload }) => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const res = await api.getNotes();
      setNotes(res.notes || []);
      if (res.notes && res.notes.length > 0) {
        setSelectedNote(res.notes[0]);
        setEditContent(res.notes[0].content);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSelectNote = (note: StudyNote) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedNote) return;
    try {
      const res = await api.updateNote(selectedNote.id, { content: editContent });
      setSelectedNote(res.note);
      setNotes(prev => prev.map(n => (n.id === selectedNote.id ? res.note : n)));
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save edits');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this study note?')) return;
    try {
      await api.deleteNote(noteId);
      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      if (selectedNote?.id === noteId) {
        setSelectedNote(remaining[0] || null);
        setEditContent(remaining[0]?.content || '');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete note');
    }
  };

  const handleCopy = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedNote) return;
    const blob = new Blob([selectedNote.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    return n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookCheck className="w-6 h-6 text-violet-400" />
            <span>Revision Notes & Syntheses</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            High-yield exam cram sheets, executive summaries, formulas, and terminology guides.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New Notes</span>
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-4">
          <BookCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No revision notes yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upload study documents and generate comprehensive chapter notes, formulas, or comparison tables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes Sidebar List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                    selectedNote?.id === n.id
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                      : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {n.formatType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white line-clamp-1">{n.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {n.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Reading & Editing Pane */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 flex flex-col justify-between min-h-[580px] shadow-xl">
            {selectedNote ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      {selectedNote.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Source: {selectedNote.sourceTitle || 'Uploaded Study Material'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Copy Markdown"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Download Markdown"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    {isEditing ? (
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                {isEditing ? (
                  <textarea
                    rows={18}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-950 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                    {selectedNote.content}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-20">Select a note to inspect.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
