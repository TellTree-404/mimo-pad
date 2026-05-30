import { X, Cpu, Wrench, Brain, Palette, Shield, Trash2, Download, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import type { AppSettings, ProviderConfig, McpServerConfig } from '../../types';
import { ModelConfig } from './ModelConfig';
import { McpPanel } from './McpPanel';
import { MemoryPanel } from './MemoryPanel';
import { mcpManager } from '../../services/mcp';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  connectedMcpIds: string[];
  onUpdate: (partial: Partial<AppSettings>) => void;
  onUpdateProvider: (id: string, partial: Partial<ProviderConfig>) => void;
  onSetApiKey: (id: string, key: string) => void;
  onSetActiveModel: (providerId: string, modelId: string) => void;
  onAddMcp: (server: McpServerConfig) => void;
  onToggleMcp: (id: string) => void;
  onRemoveMcp: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
}

type SettingsTab = 'models' | 'mcp' | 'memory' | 'appearance' | 'privacy';

export function SettingsPanel({
  open,
  onClose,
  settings,
  connectedMcpIds,
  onUpdate,
  onUpdateProvider,
  onSetApiKey,
  onSetActiveModel,
  onAddMcp,
  onToggleMcp,
  onRemoveMcp,
  onReset,
  onExport,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>('models');
  const [workDir, setWorkDir] = useState<string | null>(null);

  if (!open) return null;

  const tabs: { key: SettingsTab; label: string; icon: typeof Cpu }[] = [
    { key: 'models', label: '模型', icon: Cpu },
    { key: 'mcp', label: 'MCP', icon: Wrench },
    { key: 'memory', label: '记忆', icon: Brain },
    { key: 'appearance', label: '外观', icon: Palette },
    { key: 'privacy', label: '安全', icon: Shield },
  ];

  const handlePickDir = async () => {
    const dir = await mcpManager.pickDirectory();
    if (dir) setWorkDir(dir);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--bg-secondary)] h-full flex flex-col animate-slide-in-right"
        style={{ animation: 'slideInRight 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">设置</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-[var(--border)] px-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === key
                  ? 'border-[var(--accent)] text-[var(--accent-light)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'models' && (
            <ModelConfig
              providers={settings.providers}
              activeProviderId={settings.activeProviderId}
              activeModelId={settings.activeModelId}
              onUpdateProvider={onUpdateProvider}
              onSetApiKey={onSetApiKey}
              onSetActiveModel={onSetActiveModel}
            />
          )}

          {tab === 'mcp' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <div className="text-sm text-[var(--text-primary)] font-medium mb-1">工作目录</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePickDir}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-light)] text-xs hover:bg-[var(--accent-border)] transition-colors"
                  >
                    <FolderOpen size={14} />
                    选择目录
                  </button>
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {workDir || '未选择'}
                  </span>
                </div>
              </div>

              <McpPanel
                servers={settings.mcpServers}
                connectedIds={connectedMcpIds}
                onAdd={onAddMcp}
                onToggle={onToggleMcp}
                onRemove={onRemoveMcp}
              />
            </div>
          )}

          {tab === 'memory' && (
            <MemoryPanel settings={settings} onUpdate={onUpdate} />
          )}

          {tab === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">外观设置</h3>

              <div>
                <label className="text-xs text-[var(--text-muted)]">主题</label>
                <div className="flex gap-2 mt-1">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => onUpdate({ theme: t })}
                      className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
                        settings.theme === t
                          ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-light)]'
                          : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t === 'dark' ? '深色' : t === 'light' ? '浅色' : '跟随系统'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)]">字体大小: {settings.fontSize}px</label>
                <input
                  type="range"
                  min={12}
                  max={24}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                  className="w-full mt-1 accent-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)]">语音输入模式</label>
                <div className="flex gap-2 mt-1">
                  {(['toggle', 'hold'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdate({ voiceInputMode: m })}
                      className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
                        settings.voiceInputMode === m
                          ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-light)]'
                          : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {m === 'toggle' ? '点击切换' : '按住说话'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={settings.autoSendVoice}
                  onChange={(e) => onUpdate({ autoSendVoice: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                语音识别完成后自动发送
              </label>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">安全与隐私</h3>

              <div className="space-y-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm text-[var(--text-primary)] font-medium">数据完全本地存储</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      所有对话历史、API Key 仅保存在浏览器 IndexedDB/localStorage 中，不上传到任何中间服务器。
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm text-[var(--text-primary)] font-medium">HTTPS 加密传输</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      所有 API 调用均通过 HTTPS (TLS 1.3) 加密传输。API Key 通过请求头注入，绝不出现在 URL 中。
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm text-[var(--text-primary)] font-medium">零遥测零追踪</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      本应用不包含任何遥测、埋点或第三方统计分析代码。你的代码和对话仅发送给你指定的模型服务商。
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onExport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-light)] text-sm hover:bg-[var(--accent-border)] transition-colors"
                >
                  <Download size={14} />
                  导出所有数据
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定要清除所有本地数据吗？此操作不可撤销！')) {
                      onReset();
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                  清除所有数据
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] text-center">
          <span className="text-[10px] text-[var(--text-muted)]">
            MiMo Pad v1.0 · 数据主权完全由你掌控
          </span>
        </div>
      </div>
    </div>
  );
}
