import React, { useEffect, useState, useRef } from 'react';
import {
  Brain,
  Plus,
  Send,
  Trash2,
  Quote,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ShieldAlert,
  FileText,
  CornerDownLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../../api';
import { TutorConversation, ChatMessage, Source, Citation } from '../../types';

export const TutorView: React.FC = () => {
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const cleanText = text.replace(/\[\d+\]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [convRes, srcRes] = await Promise.all([
        api.getTutorConversations(),
        api.getSources(),
      ]);
      const convs = convRes.conversations || [];
      setConversations(convs);
      setSources(srcRes.sources || []);

      if (convs.length > 0) {
        selectConversation(convs[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load tutor data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const res = await api.getTutorConversation(convId);
      setMessages(res.messages || []);
      if (res.conversation.sourceId) {
        setSelectedSourceId(res.conversation.sourceId);
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleCreateNewConversation = async () => {
    try {
      const res = await api.createTutorConversation({
        sourceId: selectedSourceId !== 'all' ? selectedSourceId : undefined,
      });
      setConversations(prev => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
      setMessages([]);
    } catch (err: any) {
      alert(err.message || 'Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api.deleteTutorConversation(convId);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sending) return;

    let targetConvId = activeConvId;
    if (!targetConvId) {
      const newConv = await api.createTutorConversation({
        sourceId: selectedSourceId !== 'all' ? selectedSourceId : undefined,
      });
      targetConvId = newConv.conversation.id;
      setConversations(prev => [newConv.conversation, ...prev]);
      setActiveConvId(targetConvId);
    }

    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: targetConvId,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticUserMsg]);
    setInputMessage('');
    setSending(true);

    try {
      const res = await api.sendTutorMessage(targetConvId, text.trim());
      setMessages(prev => {
        const withoutOpt = prev.filter(m => m.id !== optimisticUserMsg.id);
        return [...withoutOpt, res.userMessage, res.assistantMessage];
      });
    } catch (err: any) {
      alert(err.message || 'Failed to send tutor message');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-200">
      {/* Left Sidebar: Conversations & Scope */}
      <div className="w-full md:w-72 flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shrink-0 overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Study Chats</span>
            </h3>
            <button
              onClick={handleCreateNewConversation}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Grounded Source Scope
            </label>
            <select
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Uploaded Sources</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Conversations List */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No previous chats.</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-center justify-between group cursor-pointer ${
                    activeConvId === conv.id
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-white font-medium'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate pr-2">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>Answers are source-grounded. Verify critical claims against citations.</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Brain className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">MindForge Grounded AI Tutor</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ask conceptual questions, request step-by-step mathematical proofs, or clarify confusing paragraphs from your uploaded materials.
                </p>
              </div>

              {/* Starter prompts */}
              <div className="flex flex-col gap-2 w-full pt-2">
                {[
                  'What are the primary mechanisms detailed in this text?',
                  'Can you summarize the core formula or theorem?',
                  'What are common exam pitfalls related to this subject?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/40 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className="space-y-2">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-xl p-4 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-xs sm:text-sm leading-relaxed shadow-md">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 max-w-2xl">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                      <Brain className="w-4 h-4" />
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className="p-5 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-950/70 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans shadow-lg">
                        {msg.content}
                      </div>

                      {/* Grounded Citations List */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <Quote className="w-3.5 h-3.5" />
                            <span>Grounded Source Citations</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setActiveCitation(c)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>[{cIdx + 1}]</span>
                                <span className="font-sans truncate max-w-[160px]">{c.sourceTitle}</span>
                                {c.pageNumber && <span>(P. {c.pageNumber})</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Follow-Ups */}
                      {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">Continue Inquiry:</span>
                          {msg.suggestedFollowUps.map((fu, fuIdx) => (
                            <button
                              key={fuIdx}
                              onClick={() => handleSendMessage(fu)}
                              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors cursor-pointer"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 pt-1 text-slate-500 text-xs">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-slate-300 cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleSpeak(msg.content)}
                          className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer transition-colors"
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-indigo-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-950/70 text-xs text-indigo-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Retrieving source chunks and formulating grounded answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Ask a question about your uploaded materials..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Popover Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Quote className="w-4 h-4 text-indigo-400" />
                <span>Source Citation Details</span>
              </h4>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-200">{activeCitation.sourceTitle}</p>
              {activeCitation.pageNumber && (
                <p className="text-indigo-400 font-mono">Page: {activeCitation.pageNumber}</p>
              )}
              {activeCitation.timestamp && (
                <p className="text-violet-400 font-mono">Time: {activeCitation.timestamp}</p>
              )}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 italic leading-relaxed">
                "{activeCitation.quote || 'Excerpt from corresponding document section.'}"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
