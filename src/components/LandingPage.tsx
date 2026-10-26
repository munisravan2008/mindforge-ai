import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  FileText,
  Video,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  BarChart3,
  Layers,
  GraduationCap,
  RotateCw,
  Clock,
  Volume2,
  VolumeX,
  ChevronDown,
  Quote,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { demoLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz' | 'tutor' | 'dossier'>('flashcards');

  // Interactive Flashcard State
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [previewCardIndex, setPreviewCardIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const previewCards = [
    {
      front: 'Where in eukaryotic cells does glycolysis take place, and does it consume O₂?',
      back: 'Cytoplasm (Cytosol). It is strictly anaerobic and consumes zero molecular oxygen.',
      citation: 'Page 1 · Glycolytic Pathways',
      category: 'Cellular Respiration',
    },
    {
      front: 'Which substrate condenses with oxaloacetate in the initial reaction of the Krebs cycle?',
      back: 'Acetyl-CoA (2 carbons) condenses with Oxaloacetate (4 carbons) to generate Citrate (6 carbons).',
      citation: 'Page 2 · Mitochondrial Matrix',
      category: 'Citric Acid Cycle',
    },
    {
      front: 'What drives ATP Synthase during oxidative phosphorylation?',
      back: 'The Proton Motive Force (PMF) created by Complexes I, III, and IV pumping H⁺ into the intermembrane space.',
      citation: 'Page 3 · Chemiosmosis',
      category: 'Oxidative Phosphorylation',
    },
  ];

  // Text to Speech
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Interactive Quiz State
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const sampleQuiz = {
    question: 'How many net ATP and NADH molecules are produced per glucose molecule during glycolysis alone?',
    options: [
      '4 Net ATP and 2 NADH',
      '2 Net ATP and 2 NADH',
      '2 Net ATP and 0 NADH',
      '32 Net ATP and 10 NADH',
    ],
    correctIndex: 1,
    explanation:
      'Glycolysis uses 2 ATP in the preparatory phase and generates 4 ATP in the payoff phase, yielding a net gain of 2 ATP and 2 NADH per glucose.',
    citation: 'Cellular Respiration (Bio 101) · Page 1',
  };

  // Interactive Tutor State
  const [activeCitationDrawer, setActiveCitationDrawer] = useState<{
    source: string;
    page: string;
    excerpt: string;
  } | null>(null);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does MindForge AI anchor answers in uploaded files?',
      a: 'MindForge decomposes documents into semantic chunks with overlap while recording exact page numbers and video timestamps. When you query the platform or generate flashcards, our TF-IDF RAG retrieval ranks the highest-density chunks, and the AI cites source pages directly in brackets [1].',
    },
    {
      q: 'What file types are accepted?',
      a: 'Multi-page PDFs (with per-page parsing), Microsoft Word (.docx), plain text (.txt), Markdown (.md), and public YouTube URLs with English captions.',
    },
    {
      q: 'How does the spaced repetition schedule work?',
      a: 'Cards are graded on a 5-tier retention scale. Indicating a card is known advances its review interval to 3, 7, 14, or 30 days. Marking it for review resets the interval to 24 hours so you focus strictly on recall gaps.',
    },
    {
      q: 'Can I export study materials offline?',
      a: 'Yes. Every study set can be exported as a consolidated Markdown study dossier, including source digests, key vocabulary, flashcard questions, and quiz answer keys.',
    },
    {
      q: 'Are uploaded documents used to train third-party models?',
      a: 'No. Uploaded files and study materials are strictly scoped to your private user account on the server and are never fed into model retraining loops.',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-100">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] bg-indigo-600/20 blur-[140px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative pt-16 sm:pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Unboxed Kicker metadata */}
          <div className="text-xs font-medium text-slate-400 tracking-wide flex items-center justify-center gap-2">
            <span>Source-Grounded Study Engine</span>
            <span aria-hidden="true">·</span>
            <span>Spaced Repetition & Verified Quizzes</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-400">Gemini 3.8 Flash</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] [text-wrap:balance]">
            Convert Academic Textbooks & Lectures into an Active Recall Cockpit.
          </h1>

          {/* Body Prose */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed [text-wrap:balance]">
            Upload PDFs, Word docs, and YouTube lectures. MindForge extracts exact pages, builds 5-tier spaced repetition decks, generates assessed quizzes, and guides your revision with citation-backed answers.
          </p>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => demoLogin()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all text-sm cursor-pointer"
            >
              <span>Explore Interactive Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition-all text-sm cursor-pointer"
            >
              <span>Create Free Account</span>
            </button>
          </div>

          {/* Editorial Trust Markers */}
          <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
            <span>Instant Pre-loaded Bio 101 Set</span>
            <span aria-hidden="true">·</span>
            <span>Zero Hallucination Grounding</span>
            <span aria-hidden="true">·</span>
            <span>Export to Markdown</span>
          </div>
        </div>

        {/* INTERACTIVE STUDY LAB WORKBENCH */}
        <div id="lab" className="mt-16 sm:mt-20 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
            {/* Workbench Header */}
            <div className="border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="text-white font-medium">Cellular_Respiration_Bio101.pdf</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">3 Pages Ingested</span>
              </div>

              {/* Functional Segmented Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'flashcards'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Flashcard Recall
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'quiz'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Assessed Quiz
                </button>
                <button
                  onClick={() => setActiveTab('tutor')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'tutor'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Grounded Tutor
                </button>
                <button
                  onClick={() => setActiveTab('dossier')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'dossier'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Revision Dossier
                </button>
              </div>
            </div>

            {/* Workbench Stage */}
            <div className="p-6 sm:p-10 min-h-[380px] flex items-center justify-center bg-slate-950/40">
              {/* TAB 1: FLASHCARD WITH 3D FLIP & AUDIO */}
              {activeTab === 'flashcards' && (
                <div className="w-full max-w-xl mx-auto space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        Card {previewCardIndex + 1} of {previewCards.length}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{previewCards[previewCardIndex].category}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleSpeak(
                            previewFlipped
                              ? previewCards[previewCardIndex].back
                              : previewCards[previewCardIndex].front
                          )
                        }
                        className="p-1 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Read aloud"
                      >
                        {isSpeaking ? (
                          <VolumeX className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-mono text-slate-500">
                        {previewCards[previewCardIndex].citation}
                      </span>
                    </div>
                  </div>

                  {/* 3D Interactive Card */}
                  <div
                    onClick={() => setPreviewFlipped(!previewFlipped)}
                    className="relative w-full h-56 cursor-pointer select-none perspective-1000"
                  >
                    <div
                      className={`w-full h-full duration-500 transform-style-3d transition-transform rounded-2xl border ${
                        previewFlipped
                          ? 'rotate-y-180 border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-slate-900'
                          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                      } p-6 flex flex-col justify-between shadow-xl`}
                    >
                      {/* Front Side */}
                      <div className={`space-y-3 ${previewFlipped ? 'hidden' : 'block'}`}>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono uppercase tracking-wider">Prompt Question</span>
                          <span className="text-indigo-400 text-[11px]">Click or press Space to reveal answer</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-100 leading-snug">
                          {previewCards[previewCardIndex].front}
                        </p>
                      </div>

                      {/* Back Side */}
                      <div className={`space-y-3 ${previewFlipped ? 'block' : 'hidden'} rotate-y-180`}>
                        <div className="flex items-center justify-between text-xs text-indigo-300">
                          <span className="font-mono uppercase tracking-wider">Ground Truth Answer</span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            {previewCards[previewCardIndex].citation}
                          </span>
                        </div>
                        <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                          {previewCards[previewCardIndex].back}
                        </p>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-500">
                        <span>Spaced Repetition: Level 2</span>
                        <span className="text-slate-400">Click to flip</span>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setPreviewFlipped(false);
                        setPreviewCardIndex(
                          (previewCardIndex - 1 + previewCards.length) % previewCards.length
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1.5">
                      {previewCards.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPreviewFlipped(false);
                            setPreviewCardIndex(i);
                          }}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            previewCardIndex === i ? 'bg-indigo-500' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setPreviewFlipped(false);
                        setPreviewCardIndex((previewCardIndex + 1) % previewCards.length);
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      Next Card
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTIVE QUIZ QUESTION */}
              {activeTab === 'quiz' && (
                <div className="w-full max-w-xl mx-auto space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Question 1 of 5</span>
                      <span className="font-mono text-slate-500">{sampleQuiz.citation}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
                      {sampleQuiz.question}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2">
                    {sampleQuiz.options.map((opt, i) => {
                      const isChosen = quizSelected === i;
                      const isCorrect = i === sampleQuiz.correctIndex;
                      let optionStyle =
                        'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700';

                      if (quizSubmitted) {
                        if (isCorrect) {
                          optionStyle = 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200';
                        } else if (isChosen && !isCorrect) {
                          optionStyle = 'border-rose-500/50 bg-rose-950/30 text-rose-200';
                        }
                      } else if (isChosen) {
                        optionStyle = 'border-indigo-500 bg-indigo-950/40 text-white';
                      }

                      return (
                        <button
                          key={i}
                          disabled={quizSubmitted}
                          onClick={() => setQuizSelected(i)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                        >
                          <span>{opt}</span>
                          {quizSubmitted && isCorrect && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          )}
                          {quizSubmitted && isChosen && !isCorrect && (
                            <X className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission and Explanation */}
                  <div className="pt-2">
                    {!quizSubmitted ? (
                      <button
                        disabled={quizSelected === null}
                        onClick={() => setQuizSubmitted(true)}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all ${
                          quizSelected !== null
                            ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Check Answer
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-semibold ${
                              quizSelected === sampleQuiz.correctIndex
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {quizSelected === sampleQuiz.correctIndex
                              ? 'Correct Answer'
                              : 'Incorrect'}
                          </span>
                          <button
                            onClick={() => {
                              setQuizSelected(null);
                              setQuizSubmitted(false);
                            }}
                            className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
                          >
                            Retry Question
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sampleQuiz.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: GROUNDED TUTOR WITH CITATION DRAWER */}
              {activeTab === 'tutor' && (
                <div className="w-full max-w-xl mx-auto space-y-4">
                  {/* Chat dialog */}
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-md p-3.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-xs sm:text-sm">
                        Why is oxygen essential if glycolysis doesn't use it?
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="p-4 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/90 text-xs sm:text-sm text-slate-200 leading-relaxed">
                          Oxygen acts as the terminal electron acceptor in the mitochondrial electron transport chain. Without oxygen, NADH cannot be reoxidized to NAD⁺ via oxidative phosphorylation, halting the citric acid cycle{' '}
                          <button
                            onClick={() =>
                              setActiveCitationDrawer({
                                source: 'Bio 101 Lecture Notes',
                                page: 'Page 3 · Electron Transport & Terminal Acceptors',
                                excerpt:
                                  'Molecular oxygen (O₂) has high electronegativity, drawing electrons through Complex IV. Its reduction forms metabolic H₂O and sustains the proton motive force required by ATP Synthase.',
                              })
                            }
                            className="font-mono text-indigo-400 hover:underline cursor-pointer"
                          >
                            [1] (Page 3)
                          </button>
                          .
                        </div>

                        {/* Citation drawer callout */}
                        {activeCitationDrawer && (
                          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 text-xs space-y-1.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-indigo-300">
                              <span className="font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                <Quote className="w-3 h-3" />
                                <span>Grounded Source Excerpt</span>
                              </span>
                              <button
                                onClick={() => setActiveCitationDrawer(null)}
                                className="text-slate-400 hover:text-white text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <p className="text-slate-200 italic leading-relaxed">
                              "{activeCitationDrawer.excerpt}"
                            </p>
                            <p className="text-[11px] font-mono text-indigo-400">
                              Source: {activeCitationDrawer.source} · {activeCitationDrawer.page}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REVISION DOSSIER */}
              {activeTab === 'dossier' && (
                <div className="w-full max-w-xl mx-auto space-y-3 font-mono text-xs">
                  <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                      <span className="text-white font-semibold">STUDY_DOSSIER_BIO101.md</span>
                      <button
                        onClick={() => demoLogin()}
                        className="text-indigo-400 hover:underline font-sans cursor-pointer"
                      >
                        Open In Workspace →
                      </button>
                    </div>
                    <div className="space-y-2 text-slate-300 font-sans text-xs leading-relaxed">
                      <h4 className="font-bold text-white text-sm">
                        01. Executive Conceptual Summary
                      </h4>
                      <p>
                        Cellular respiration converts biochemical energy from nutrients into ATP,
                        yielding up to 30–32 ATP molecules per oxidized glucose through Glycolysis,
                        Pyruvate Oxidation, Citric Acid Cycle, and Oxidative Phosphorylation.
                      </p>
                      <h4 className="font-bold text-white text-sm pt-2">
                        02. High-Yield Key Equations
                      </h4>
                      <code className="block p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-indigo-300">
                        C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + ~32 ATP
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY & INGESTION ARCHITECTURE */}
      <section id="pipeline" className="py-20 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
              Ingestion, Grounding, and Retrieval Architecture
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              How MindForge transforms raw lecture material into high-yield recall assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-sm font-semibold text-white">Multi-Format Ingestion</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts text layer from multi-page PDFs, Microsoft Word files, and YouTube closed
                captions with time markers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-sm font-semibold text-white">Semantic Chunking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Preserves source boundary metadata and generates overlapping token windows to avoid
                splitting definitions.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-sm font-semibold text-white">RAG Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vector-like TF-IDF retrieval ranks candidate paragraphs. Flashcards and quiz answers
                anchor to exact page numbers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                04
              </div>
              <h3 className="text-sm font-semibold text-white">5-Tier Repetition</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Optimal Leitner interval algorithm dynamically schedules cards due for review based
                on your daily recall performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QUANTITATIVE BENCHMARK STRIP */}
      <section className="py-14 border-y border-slate-800/80 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-xs text-slate-400">Source-Grounded Citations</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                5-Tier
              </div>
              <p className="text-xs text-slate-400">Spaced Repetition Algorithm</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                4-in-1
              </div>
              <p className="text-xs text-slate-400">Flashcards, Quizzes, Notes, Tutor</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                &lt; 2.5s
              </div>
              <p className="text-xs text-slate-400">Gemini 3.8 Flash Generation</p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES BENTO */}
      <section id="capabilities" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
            Engineered for Intense Academic Workloads
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Everything you need to master syllabi without hallucinated shortcuts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Active Recall Flashcards</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate front/back flashcard decks with keyboard navigation (Space, Arrows, 1/2) and
              custom Leitner scheduling to eliminate forgetting curves.
            </p>
          </div>

          <div className="p-7 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Timed Comprehension Quizzes</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Multi-format testing (MCQ, True/False, Short Answer, Fill-in-Blank) scored server-side
              with detailed reasoning and cited source references.
            </p>
          </div>

          <div className="p-7 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Interactive Socratic Tutor</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Engage in multi-turn study dialogues that quote specific paragraphs, highlight key
              terms, and guide your reasoning step-by-step.
            </p>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight [text-wrap:balance]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400">
              Clear answers on document handling, grounding verification, and data privacy.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left text-sm font-semibold text-white flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-indigo-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA STRIP */}
      <section className="py-20 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight [text-wrap:balance]">
            Ready to master your syllabus in half the time?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Experience source-grounded active recall. Jump into the live interactive demo or create
            your personal library today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => demoLogin()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all text-sm cursor-pointer"
            >
              <span>Launch Demo With Bio 101 Set</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all text-sm cursor-pointer"
            >
              <span>Sign Up Free</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
