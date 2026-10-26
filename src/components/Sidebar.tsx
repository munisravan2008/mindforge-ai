import React from 'react';
import {
  LayoutDashboard,
  Files,
  FolderKanban,
  BookOpen,
  HelpCircle,
  Brain,
  History,
  BarChart3,
  Settings,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  BookCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppTab =
  | 'overview'
  | 'sources'
  | 'source-detail'
  | 'collections'
  | 'flashcards'
  | 'quizzes'
  | 'tutor'
  | 'revision'
  | 'notes'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  onNewSession,
}) => {
  const { user, demoLogin } = useAuth();
  const isDemoUser = user?.id === 'user-demo-mindforge-001' || user?.email === 'demo@mindforge.ai';

  const navItems: { id: AppTab; label: string; icon: any; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sources', label: 'My Sources', icon: Files },
    { id: 'collections', label: 'Collections', icon: FolderKanban },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes & Exams', icon: HelpCircle },
    { id: 'tutor', label: 'AI Study Tutor', icon: Brain },
    { id: 'notes', label: 'Revision Notes', icon: BookCheck },
    { id: 'revision', label: 'Spaced Review', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative z-30 h-screen border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          {!collapsed && (
            <div
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 p-0.5 shadow-md shadow-indigo-600/30">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Brain className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                </div>
              </div>
              <span className="font-bold text-base text-white tracking-tight">MindForge</span>
              <span className="text-[10px] px-1 py-0.2 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI
              </span>
            </div>
          )}

          {collapsed && (
            <div
              onClick={() => onSelectTab('overview')}
              className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Brain className="w-5 h-5" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer ${
              collapsed ? 'hidden' : 'block'
            }`}
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* New Session Action */}
        <div className="p-3">
          <button
            onClick={onNewSession}
            className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              collapsed
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white p-2.5'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20'
            }`}
            title="Upload source or generate new study tools"
          >
            <PlusCircle className="w-4 h-4" />
            {!collapsed && <span>New Study Session</span>}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="px-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Panel: Demo Badge & Expand Toggle */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {isDemoUser && !collapsed && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Judge Evaluation Active</span>
            </div>
            <p className="text-slate-400 leading-tight">
              Pre-loaded with Biology Bio 101: Cellular Respiration data set.
            </p>
          </div>
        )}

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
