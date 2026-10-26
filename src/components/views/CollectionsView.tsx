import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  FileText,
  Video,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../api';
import { Collection, Source } from '../../types';

interface CollectionsViewProps {
  onSelectSource: (sourceId: string) => void;
  onOpenUpload: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onSelectSource,
  onOpenUpload,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCol, setActiveCol] = useState<Collection | null>(null);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(true);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const res = await api.getCollections();
      setCollections(res.collections || []);
      if (res.collections && res.collections.length > 0) {
        selectCollection(res.collections[0].id);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const selectCollection = async (id: string) => {
    try {
      const res = await api.getCollection(id);
      setActiveCol(res.collection);
      setActiveSources(res.sources || []);
    } catch (err) {
      console.error('Failed to load collection details:', err);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await api.createCollection(name.trim(), description.trim(), color);
      setCollections(prev => [...prev, res.collection]);
      setActiveCol(res.collection);
      setActiveSources([]);
      setShowCreate(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      alert(err.message || 'Failed to create collection');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!window.confirm('Delete this collection?')) return;
    try {
      await api.deleteCollection(id);
      const remaining = collections.filter(c => c.id !== id);
      setCollections(remaining);
      if (activeCol?.id === id) {
        if (remaining.length > 0) {
          selectCollection(remaining[0].id);
        } else {
          setActiveCol(null);
          setActiveSources([]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete collection');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            <span>Study Collections</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Group related documents, research papers, and lectures into unified subjects.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Collections List */}
        <div className="space-y-3">
          {collections.map(col => (
            <div
              key={col.id}
              onClick={() => selectCollection(col.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeCol?.id === col.id
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-md'
                  : 'border-slate-800 bg-slate-900/70 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: col.color || '#6366f1' }}
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{col.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {col.sourceCount || 0} sources linked
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(col.id);
                }}
                className="text-slate-500 hover:text-rose-400 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Collection Details and Linked Sources */}
        <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6">
          {activeCol ? (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: activeCol.color }}
                  />
                  <span>{activeCol.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeCol.description || 'Collection of related study materials and notes.'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Included Sources ({activeSources.length})
                </h4>
                {activeSources.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500 space-y-2">
                    <p>No sources linked to this collection yet.</p>
                    <button
                      onClick={onOpenUpload}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium"
                    >
                      Add Material
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeSources.map(s => (
                      <div
                        key={s.id}
                        onClick={() => onSelectSource(s.id)}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          {s.type === 'youtube' ? <Video className="w-4 h-4 text-violet-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
                          <span className="font-medium text-white group-hover:text-indigo-300">
                            {s.title}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-16 text-xs">Select or create a collection.</p>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Create New Study Collection</h3>
            <form onSubmit={handleCreateCollection} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Molecular Biochemistry"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Subject notes and exam materials..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Color Theme</label>
                <div className="flex gap-2">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
