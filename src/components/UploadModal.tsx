import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Video,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { Source } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceUploaded: (source: Source) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSourceUploaded,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'youtube' | 'notes'>('file');

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube State
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Manual Notes State
  const [notesTitle, setNotesTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');

  // Processing & Error State
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExts = ['.pdf', '.docx', '.txt', '.md', '.markdown'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExts.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError('Unsupported file type. Please upload a PDF, DOCX, TXT, or Markdown document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25 MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);
    setError(null);

    try {
      setProcessingStage('1/3: Uploading & validating document...');
      await new Promise(r => setTimeout(r, 400));

      setProcessingStage('2/3: Extracting text & preserving page boundaries...');
      const res = await api.uploadSourceFile(selectedFile);

      setProcessingStage('3/3: Running AI synthesis & topic indexing...');
      await new Promise(r => setTimeout(r, 400));

      onSourceUploaded(res.source);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process document.');
    } finally {
      setIsSubmitting(false);
      setProcessingStage(null);
    }
  };

  const handleImportYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) {
      setError('Please provide a YouTube video URL.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      setProcessingStage('1/3: Connecting to YouTube lecture stream...');
      await new Promise(r => setTimeout(r, 400));

      setProcessingStage('2/3: Extracting closed captions & timestamp boundaries...');
      const res = await api.importYouTube(youtubeUrl.trim());

      setProcessingStage('3/3: Building structured lecture chapters...');
      await new Promise(r => setTimeout(r, 400));

      onSourceUploaded(res.source);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to extract YouTube transcript.');
    } finally {
      setIsSubmitting(false);
      setProcessingStage(null);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesTitle.trim() || !notesContent.trim()) {
      setError('Please provide both a title and study content.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      setProcessingStage('Segmenting notes into semantic study chunks...');
      const res = await api.createManualSource(notesTitle.trim(), notesContent.trim());
      onSourceUploaded(res.source);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save notes.');
    } finally {
      setIsSubmitting(false);
      setProcessingStage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span>Import Study Material</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload notes or video lectures to create your grounded AI study system.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'file' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('youtube');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'youtube' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>YouTube Lecture</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('notes');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'notes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Paste Notes</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Processing Issue</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {processingStage && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-semibold text-indigo-200">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{processingStage}</span>
            </div>
            <div className="w-full bg-indigo-950/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-1.5 rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* TAB 1: FILE UPLOAD */}
        {activeTab === 'file' && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white truncate max-w-sm mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-rose-400 hover:underline pt-2 inline-block cursor-pointer"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Click to browse or drag and drop your file
                  </p>
                  <p className="text-xs text-slate-400">
                    PDF, DOCX, TXT, or Markdown documents (up to 25 MB)
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedFile || isSubmitting}
              onClick={handleUploadFile}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Document...</span>
                </>
              ) : (
                <>
                  <span>Process & Analyze Source</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: YOUTUBE VIDEO */}
        {activeTab === 'youtube' && (
          <form onSubmit={handleImportYouTube} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                YouTube Lecture or Educational Video URL
              </label>
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Note: Video must have closed captions (English or auto-generated) enabled to extract timestamps and transcript chunks.
              </p>
            </div>

            <button
              type="submit"
              disabled={!youtubeUrl || isSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Retrieving Transcripts...</span>
                </>
              ) : (
                <>
                  <span>Extract Video Lecture</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: PASTE NOTES */}
        {activeTab === 'notes' && (
          <form onSubmit={handleSaveNotes} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Study Topic / Title</label>
              <input
                type="text"
                required
                value={notesTitle}
                onChange={e => setNotesTitle(e.target.value)}
                placeholder="e.g. Constitutional Law — Article III Powers"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Lecture Content or Raw Notes</label>
              <textarea
                required
                rows={6}
                value={notesContent}
                onChange={e => setNotesContent(e.target.value)}
                placeholder="Paste lecture transcript, summary notes, or textbook excerpts here..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={!notesTitle || !notesContent || isSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Notes...</span>
                </>
              ) : (
                <>
                  <span>Save & Segment Study Material</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
