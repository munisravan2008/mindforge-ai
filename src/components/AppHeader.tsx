import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Upload,
  LogOut,
  Settings,
  ChevronDown,
  FileText,
  Layers,
  HelpCircle,
  BookOpen,
  Loader2,
  X,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppTab } from './Sidebar';
import { api } from '../api';

interface AppHeaderProps {
  onSelectTab: (tab: AppTab) => void;
  onOpenUpload: () => void;
  onSelectSource?: (sourceId: string) => void;
  onSelectDeck?: (deckId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
}

interface SearchResultItem {
  type: 'source' | 'card' | 'quiz' | 'note';
  id: string;
  title: string;
  snippet: string;
  sourceId?: string;
  deckId?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onSelectTab,
  onOpenUpload,
  onSelectSource,
  onSelectDeck,
  onSelectQuiz,
}) => {
  const { user, preferences, logout, aiConfigured, demoLogin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await api.search(searchQuery.trim());
        setSearchResults(res.results || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (item: SearchResultItem) => {
    setShowSearchDropdown(false);
    setSearchQuery('');

    if (item.type === 'source') {
      if (onSelectSource) onSelectSource(item.id);
      else onSelectTab('sources');
    } else if (item.type === 'card' && item.deckId) {
      if (onSelectDeck) onSelectDeck(item.deckId);
      else onSelectTab('flashcards');
    } else if (item.type === 'quiz') {
      if (onSelectQuiz) onSelectQuiz(item.id);
      else onSelectTab('quizzes');
    } else if (item.type === 'note') {
      onSelectTab('notes');
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemoData();
      setResetMessage('Demo data restored');
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: any) {
      setResetMessage(err.message || 'Reset failed');
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* User Greeting & Status (Zero-Pill Typography) */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
            {getGreeting()}, {user?.name || 'Scholar'}
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="capitalize">
              {preferences?.learningGoal?.replace('_', ' ') || 'Academic'} Goal
            </span>
            <span aria-hidden="true">·</span>
            <span>{aiConfigured ? 'Gemini 3.8 Flash Online' : 'AI Engine Ready'}</span>
          </div>
        </div>
      </div>

      {/* Global Unified Search Bar with Instant Results */}
      <div ref={searchContainerRef} className="relative hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDropdown(true);
            }}
            placeholder="Search sources, topics, flashcards, or past queries..."
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
          {!isSearching && searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Overlay */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-2 z-50 max-h-96 overflow-y-auto space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              Instant Search Matches ({searchResults.length})
            </div>
            {searchResults.map((item, idx) => (
              <button
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => handleResultClick(item)}
                className="w-full p-2.5 rounded-xl text-left hover:bg-slate-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
                  {item.type === 'source' && <FileText className="w-3.5 h-3.5" />}
                  {item.type === 'card' && <Layers className="w-3.5 h-3.5" />}
                  {item.type === 'quiz' && <HelpCircle className="w-3.5 h-3.5" />}
                  {item.type === 'note' && <BookOpen className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white group-hover:text-indigo-300 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-500 ml-2 shrink-0">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.snippet}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Material</span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-lg object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="text-xs font-medium text-slate-200 hidden lg:inline">{user?.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-2 space-y-1 animate-in fade-in duration-150 z-50">
              <div className="px-3 py-2 border-b border-slate-800/80">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onSelectTab('settings');
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Account & Preferences</span>
              </button>

              <button
                onClick={handleResetDemo}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                title="Restore seeded Bio 101 study deck and tests"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Reset Demo Materials</span>
              </button>
              {resetMessage && (
                <div className="px-3 py-1 text-[11px] text-emerald-400 font-mono">
                  {resetMessage}
                </div>
              )}

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
