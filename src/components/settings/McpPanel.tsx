import { useState } from 'react';
import { Plus, Play, Square, Trash2 } from 'lucide-react';
import type { McpServerConfig } from '../../types';

interface McpPanelProps {
  servers: McpServerConfig[];
  connectedIds: string[];
  onAdd: (server: McpServerConfig) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function McpPanel({ servers, connectedIds, onAdd, onToggle, onRemove }: McpPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: `mcp-${Date.now()}`,
      name: name.trim(),
      type: url.trim() ? 'sse' : 'builtin',
      url: url.trim() || undefined,
      enabled: true,
      autoApprove,
    });
    setName('');
    setUrl('');
    setAutoApprove(false);
    setShowAdd(false);
  };

  const builtinTools = [
    { name: 'read_file', desc: '读取工作目录中的文件' },
    { name: 'search_files', desc: '按 glob 模式搜索文件' },
    { name: 'web_search', desc: '通过 DuckDuckGo 搜索网络' },
    { name: 'execute_code', desc: '在沙箱中执行 JavaScript 代码' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">MCP 工具服务器</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-light)] text-xs hover:bg-[var(--accent-border)] transition-colors"
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-lg border border-[var(--accent-border)] bg-[var(--bg-tertiary)] space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="服务器名称"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)]"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="SSE 地址 (留空则启用内置工具)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)]"
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            自动批准工具调用
          </label>
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-light)] transition-colors"
          >
            添加服务器
          </button>
        </div>
      )}

      <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-bg)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">内置工具</span>
          <button
            onClick={() => {
              const existing = servers.find((s) => s.id === 'builtin');
              if (existing) {
                onToggle('builtin');
              } else {
                onAdd({
                  id: 'builtin',
                  name: '内置工具集',
                  type: 'builtin',
                  enabled: true,
                  autoApprove: false,
                });
              }
            }}
            className="p-1.5 rounded-lg bg-[var(--accent-bg)] hover:bg-[var(--accent-border)] text-[var(--accent-light)] transition-colors"
          >
            {connectedIds.includes('builtin') ? <Square size={14} /> : <Play size={14} />}
          </button>
        </div>
        <div className="space-y-1">
          {builtinTools.map((t) => (
            <div key={t.name} className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-light)]" />
              <code className="text-[10px] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded">{t.name}</code>
              <span className="text-[var(--text-muted)]">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {servers.filter((s) => s.id !== 'builtin').map((server) => (
        <div
          key={server.id}
          className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]"
        >
          <div>
            <div className="text-sm text-[var(--text-primary)]">{server.name}</div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {server.type.toUpperCase()} · {server.url || 'local'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(server.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                connectedIds.includes(server.id)
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
              }`}
            >
              {connectedIds.includes(server.id) ? <Square size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => onRemove(server.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <div className="pt-3 border-t border-[var(--border)]">
        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">使用说明</h4>
        <ol className="text-[10px] text-[var(--text-muted)] space-y-1 list-decimal list-inside">
          <li>启用内置工具集后，AI 可以读写文件、搜索网络</li>
          <li>文件操作需要先在文件浏览器中选择工作目录</li>
          <li>工具调用结果会直接显示在对话中</li>
          <li>建议开启"自动批准"以提高效率</li>
        </ol>
      </div>
    </div>
  );
}
