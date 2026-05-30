import { MessageSquarePlus, Trash2, Download, Search } from 'lucide-react';
import { useState } from 'react';
import type { Conversation } from '../../types';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onExport,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [contextId, setContextId] = useState<string | null>(null);

  const filtered = search
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="搜索对话..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </div>
        </div>
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white font-semibold transition-colors text-base active:scale-95 min-h-[50px]"
        >
          <MessageSquarePlus size={20} />
          新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.map((conv) => (
          <div
            key={conv.id}
            className="relative group"
            onContextMenu={(e) => {
              e.preventDefault();
              setContextId(contextId === conv.id ? null : conv.id);
            }}
          >
            <button
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-colors text-sm truncate block ${
                conv.id === activeId
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="truncate font-medium">{conv.title}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {conv.messages.length} 条消息 · {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
            </button>

            {contextId === conv.id && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-[var(--bg-secondary)] rounded-lg shadow-lg border border-[var(--border)] p-1 z-10">
                <button
                  onClick={() => { onDelete(conv.id); setContextId(null); }}
                  className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => { onExport(conv.id); setContextId(null); }}
                  className="p-1.5 rounded hover:bg-[var(--accent-bg)] text-[var(--accent-light)] transition-colors"
                  title="导出"
                >
                  <Download size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-sm mt-8">
            {search ? '未找到匹配的对话' : '暂无对话'}
          </div>
        )}
      </div>
    </div>
  );
}
