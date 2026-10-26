import React from 'react';
import { Brain, ShieldAlert, Sparkles, BookCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base text-white tracking-tight">MindForge AI</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs sm:text-sm">
              Your personal AI-powered academic learning engine. Convert complex textbooks, research PDFs, lecture transcripts, and notes into interactive flashcards, spaced-repetition decks, assessments, and grounded tutor dialogues.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs max-w-lg">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Academic Verification Notice:</strong> AI-generated summaries, flashcards, and answers can contain inaccuracies. Always cross-verify critical claims against your primary source materials.
              </span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Study Tools</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">AI Flashcards & Spaced Repetition</a></li>
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Smart Quiz & Assessment Engine</a></li>
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Source-Grounded AI Tutor</a></li>
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">YouTube Video Transcript Analysis</a></li>
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">High-Yield Exam Cram Sheets</a></li>
            </ul>
          </div>

          {/* Legal and Security */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Privacy & Security</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><span className="text-slate-300">Strict Data Isolation</span></li>
              <li><span className="text-slate-300">Private Document Storage</span></li>
              <li><span className="text-slate-300">No Model Training on User Data</span></li>
              <li><span className="text-slate-300">User Data Deletion Guarantee</span></li>
              <li><span className="text-slate-400 text-xs">Platform version 1.0.0</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MindForge AI. Built for students, researchers, and lifelong learners.</p>
          <div className="flex items-center gap-6">
            <span>Server-side RAG Pipeline</span>
            <span>•</span>
            <span>Gemini 3.8 Flash Powered</span>
            <span>•</span>
            <span>Local Persistent Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
