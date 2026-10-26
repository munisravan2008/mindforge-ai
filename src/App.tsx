import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { Sidebar, AppTab } from './components/Sidebar';
import { AppHeader } from './components/AppHeader';
import { UploadModal } from './components/UploadModal';
import { DashboardOverview } from './components/views/DashboardOverview';
import { SourcesView } from './components/views/SourcesView';
import { SourceWorkspace } from './components/views/SourceWorkspace';
import { FlashcardsView } from './components/views/FlashcardsView';
import { FlashcardStudyModal } from './components/views/FlashcardStudyModal';
import { QuizzesView } from './components/views/QuizzesView';
import { QuizPlayerModal } from './components/views/QuizPlayerModal';
import { TutorView } from './components/views/TutorView';
import { NotesView } from './components/views/NotesView';
import { CollectionsView } from './components/views/CollectionsView';
import { RevisionView } from './components/views/RevisionView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsView } from './components/views/SettingsView';
import { Source } from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Active resource inspections
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Handle URL hash changes for easy bookmarking and deep linking
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash.startsWith('app/sources/')) {
        const id = hash.replace('app/sources/', '');
        setSelectedSourceId(id);
        setCurrentTab('source-detail');
      } else if (hash === 'app/sources') {
        setCurrentTab('sources');
      } else if (hash === 'app/flashcards') {
        setCurrentTab('flashcards');
      } else if (hash === 'app/quizzes') {
        setCurrentTab('quizzes');
      } else if (hash === 'app/tutor') {
        setCurrentTab('tutor');
      } else if (hash === 'app/analytics') {
        setCurrentTab('analytics');
      } else if (hash === 'app/settings') {
        setCurrentTab('settings');
      } else if (hash === 'app') {
        setCurrentTab('overview');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setCurrentTab('source-detail');
    window.location.hash = `#/app/sources/${sourceId}`;
  };

  const handleSourceUploaded = (source: Source) => {
    setSelectedSourceId(source.id);
    setCurrentTab('source-detail');
    window.location.hash = `#/app/sources/${source.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
          Initializing MindForge AI Learning System...
        </p>
      </div>
    );
  }

  // 1. PUBLIC LANDING PAGE (Unauthenticated)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar onOpenAuth={handleOpenAuth} />
        <main className="flex-1">
          <LandingPage onOpenAuth={handleOpenAuth} />
        </main>
        <Footer />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            window.location.hash = '#/app';
          }}
        />
      </div>
    );
  }

  // 2. AUTHENTICATED WORKSPACE SHELL
  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          if (tab !== 'source-detail') setSelectedSourceId(null);
          window.location.hash = `#/app${tab === 'overview' ? '' : `/${tab}`}`;
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewSession={() => setUploadModalOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          onSelectTab={tab => {
            setCurrentTab(tab);
            window.location.hash = `#/app${tab === 'overview' ? '' : `/${tab}`}`;
          }}
          onOpenUpload={() => setUploadModalOpen(true)}
          onSelectSource={handleSelectSource}
          onSelectDeck={id => setSelectedDeckId(id)}
          onSelectQuiz={id => setSelectedQuizId(id)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'overview' && (
              <DashboardOverview
                onSelectTab={tab => {
                  setCurrentTab(tab);
                  window.location.hash = `#/app${tab === 'overview' ? '' : `/${tab}`}`;
                }}
                onOpenUpload={() => setUploadModalOpen(true)}
                onSelectSource={handleSelectSource}
                onSelectDeck={id => setSelectedDeckId(id)}
                onSelectQuiz={id => setSelectedQuizId(id)}
              />
            )}

            {currentTab === 'sources' && (
              <SourcesView
                onSelectSource={handleSelectSource}
                onOpenUpload={() => setUploadModalOpen(true)}
              />
            )}

            {currentTab === 'source-detail' && selectedSourceId && (
              <SourceWorkspace
                sourceId={selectedSourceId}
                onBack={() => {
                  setSelectedSourceId(null);
                  setCurrentTab('sources');
                  window.location.hash = '#/app/sources';
                }}
                onSelectDeck={id => setSelectedDeckId(id)}
                onSelectQuiz={id => setSelectedQuizId(id)}
                onSelectTab={tab => {
                  setCurrentTab(tab);
                  window.location.hash = `#/app/${tab}`;
                }}
              />
            )}

            {currentTab === 'collections' && (
              <CollectionsView
                onSelectSource={handleSelectSource}
                onOpenUpload={() => setUploadModalOpen(true)}
              />
            )}

            {currentTab === 'flashcards' && (
              <FlashcardsView onOpenUpload={() => setUploadModalOpen(true)} />
            )}

            {currentTab === 'quizzes' && (
              <QuizzesView onOpenUpload={() => setUploadModalOpen(true)} />
            )}

            {currentTab === 'tutor' && <TutorView />}

            {currentTab === 'notes' && (
              <NotesView onOpenUpload={() => setUploadModalOpen(true)} />
            )}

            {currentTab === 'revision' && <RevisionView />}

            {currentTab === 'analytics' && <AnalyticsView />}

            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSourceUploaded={handleSourceUploaded}
      />

      {selectedDeckId && (
        <FlashcardStudyModal
          deckId={selectedDeckId}
          isOpen={Boolean(selectedDeckId)}
          onClose={() => setSelectedDeckId(null)}
        />
      )}

      {selectedQuizId && (
        <QuizPlayerModal
          quizId={selectedQuizId}
          isOpen={Boolean(selectedQuizId)}
          onClose={() => setSelectedQuizId(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
