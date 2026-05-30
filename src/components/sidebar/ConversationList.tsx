import { MessageSquarePlus, Trash2, Download, Search, FolderPlus, Layers, FolderOpen, Shield, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import type { Conversation, Project } from '../../types';

interface ConversationListProps {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  expandedProjects: Set<string>;
  onSelect: (id: string) => void;
  onCreate: (projectId?: string) => void;
  onCreateProject: (name: string) => void;
  onDelete: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExport: (id: string) => void;
  onToggleExpand: (projectId: string) => void;
  onToggleMemory: (convId: string) => void;
}

export function ConversationList({
  conversations,
  projects,
  activeId,
  expandedProjects,
  onSelect,
  onCreate,
  onCreateProject,
  onDelete,
  onDeleteProject,
  onExport,
  onToggleExpand,
  onToggleMemory,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [contextId, setContextId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [tab, setTab] = useState<'all' | 'projects'>('all');

  const orphanConvs = conversations.filter((c) => !c.projectId);

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim());
    setNewProjectName('');
    setShowNewProject(false);
  };

  const renderConv = (conv: Conversation) => (
    <div
      key={conv.id}
      className="relative group"
      onContextMenu={(e) => { e.preventDefault(); setContextId(contextId === conv.id ? null : conv.id); }}
    >
      <button
        onClick={() => onSelect(conv.id)}
        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors text-sm truncate block ${
          conv.id === activeId
            ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium truncate">{conv.title}</span>
          {!conv.memoryShared && <ShieldOff size={12} className="text-orange-400 shrink-0" />}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">
          {conv.messages.length} 条 · {conv.memoryShared ? '共享' : '隔离'}
        </div>
      </button>

      {contextId === conv.id && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-[var(--bg-secondary)] rounded-xl shadow-lg border border-[var(--border)] p-1 z-10">
          <button
            onClick={() => { onToggleMemory(conv.id); setContextId(null); }}
            className="p-2 rounded-lg hover:bg-[var(--accent-bg)] text-[var(--accent-light)] transition-colors"
            title={conv.memoryShared ? '隔离记忆' : '共享记忆'}
          >
            {conv.memoryShared ? <ShieldOff size={14} /> : <Shield size={14} />}
          </button>
          <button
            onClick={() => { onDelete(conv.id); setContextId(null); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => { onExport(conv.id); setContextId(null); }}
            className="p-2 rounded-lg hover:bg-[var(--accent-bg)] text-[var(--accent-light)] transition-colors"
            title="导出"
          >
            <Download size={14} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex rounded-xl bg-[var(--bg-tertiary)] p-0.5 flex-1">
            <button
              onClick={() => setTab('all')}
              className={`flex-1 py-2 text-xs rounded-lg transition-colors ${tab === 'all' ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]' : 'text-[var(--text-muted)]'}`}
            >
              对话
            </button>
            <button
              onClick={() => setTab('projects')}
              className={`flex-1 py-2 text-xs rounded-lg transition-colors ${tab === 'projects' ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]' : 'text-[var(--text-muted)]'}`}
            >
              项目
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCreate()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold transition-colors text-sm active:scale-95 min-h-[44px]"
            title="新建对话"
          >
            <MessageSquarePlus size={18} />
            新对话
          </button>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="px-3 py-3 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-light)] hover:bg-[var(--accent-border)] transition-colors min-h-[44px]"
            title="新建项目"
          >
            <FolderPlus size={18} />
          </button>
        </div>

        {showNewProject && (
          <div className="mt-2 flex gap-2">
            <input
              type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="项目名..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[40px]"
            />
            <button
              onClick={handleCreateProject}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-light)]"
            >
              创建
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'projects' && (
          <div className="space-y-3">
            {projects.map((proj) => {
              const projConvs = conversations.filter((c) => c.projectId === proj.id);
              const expanded = expandedProjects.has(proj.id);
              return (
                <div key={proj.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-tertiary)]">
                    <button
                      onClick={() => onToggleExpand(proj.id)}
                      className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] flex-1 text-left min-h-[36px]"
                    >
                      <span className="text-xs">{expanded ? '▼' : '▶'}</span>
                      <Layers size={14} className="text-[var(--accent-light)]" />
                      <span className="truncate">{proj.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">({projConvs.length})</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onCreate(proj.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent-bg)] text-[var(--accent-light)] transition-colors"
                        title="新建项目对话"
                      >
                        <MessageSquarePlus size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteProject(proj.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        title="删除项目"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="p-2">
                      {projConvs.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] text-center py-2">暂无对话</p>
                      ) : (
                        projConvs.map(renderConv)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'all' && (
          <>
            {orphanConvs.map(renderConv)}
            {conversations.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-sm mt-8">暂无对话</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
