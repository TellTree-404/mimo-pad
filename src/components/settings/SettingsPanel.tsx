import { X, Cpu, Wrench, Brain, Palette, Shield, Trash2, Download, Puzzle } from 'lucide-react';
import { useState } from 'react';
import type { AppSettings, ProviderConfig, McpServerConfig } from '../../types';
import { ModelConfig } from './ModelConfig';
import { McpPanel } from './McpPanel';
import { MemoryPanel } from './MemoryPanel';
import { SkillsPanel } from './SkillsPanel';
import { UpdateChecker } from './UpdateChecker';
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
  onAddProvider: (provider: ProviderConfig) => void;
  onRemoveProvider: (id: string) => void;
  onAddMcp: (server: McpServerConfig) => void;
  onToggleMcp: (id: string) => void;
  onRemoveMcp: (id: string) => void;
  onReset: () => void;
  onExport: () => void;
}

type SettingsTab = 'models' | 'mcp' | 'skills' | 'memory' | 'appearance' | 'privacy';

export function SettingsPanel({
  open,
  onClose,
  settings,
  connectedMcpIds,
  onUpdate,
  onUpdateProvider,
  onSetApiKey,
  onSetActiveModel,
  onAddProvider,
  onRemoveProvider,
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
    { key: 'skills', label: 'Skills', icon: Puzzle },
    { key: 'memory', label: '记忆', icon: Brain },
    { key: 'appearance', label: '外观', icon: Palette },
    { key: 'privacy', label: '安全', icon: Shield },
  ];

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

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'models' && (
            <ModelConfig
              providers={settings.providers}
              activeProviderId={settings.activeProviderId}
              activeModelId={settings.activeModelId}
              onUpdateProvider={onUpdateProvider}
              onSetApiKey={onSetApiKey}
              onSetActiveModel={onSetActiveModel}
              onAddProvider={onAddProvider}
              onRemoveProvider={onRemoveProvider}
            />
          )}

          {tab === 'mcp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <div className="text-sm text-[var(--text-primary)] font-medium mb-2">工作目录</div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={workDir || ''}
                    onChange={(e) => { setWorkDir(e.target.value); mcpManager.setWorkDir(e.target.value); }}
                    placeholder="/storage/emulated/0/..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[44px]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Termux', path: '/data/data/com.termux/files/home' },
                    { label: '下载', path: '/storage/emulated/0/Download' },
                    { label: '文档', path: '/storage/emulated/0/Documents' },
                  ].map((p) => (
                    <button
                      key={p.path}
                      onClick={() => { setWorkDir(p.path); mcpManager.setWorkDir?.(p.path); }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent-light)] transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
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

          {tab === 'skills' && <SkillsPanel />}

          {tab === 'memory' && (
            <MemoryPanel settings={settings} onUpdate={onUpdate} />
          )}

          {tab === 'appearance' && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">外观设置</h3>

              <div>
                <label className="text-sm text-[var(--text-muted)]">主题</label>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => onUpdate({ theme: 'dark' })}
                    className={`flex-1 py-4 rounded-xl text-sm border-2 transition-colors min-h-[56px] ${
                      settings.theme === 'dark'
                        ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-light)]'
                        : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-base font-medium">深色模式</div>
                    <div className="text-xs mt-0.5 opacity-60">黑底白字</div>
                  </button>
                  <button
                    onClick={() => onUpdate({ theme: 'parchment' })}
                    className={`flex-1 py-4 rounded-xl text-sm border-2 transition-colors min-h-[56px] ${
                      settings.theme === 'parchment'
                        ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-light)]'
                        : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-base font-medium">护眼模式</div>
                    <div className="text-xs mt-0.5 opacity-60">羊皮纸色</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--text-muted)]">字体: {settings.fontSize}px</label>
                <input
                  type="range"
                  min={14}
                  max={22}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                  className="w-full mt-2 accent-[var(--accent)] h-2"
                />
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>A</span><span className="text-lg">A</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-[var(--text-muted)]">语音模式</label>
                <div className="flex gap-3 mt-2">
                  {(['toggle', 'hold'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdate({ voiceInputMode: m })}
                      className={`flex-1 py-4 rounded-xl text-sm border-2 transition-colors min-h-[56px] ${
                        settings.voiceInputMode === m
                          ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent-light)]'
                          : 'border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-base font-medium">{m === 'toggle' ? '点击切换' : '按住说话'}</div>
                      <div className="text-xs mt-0.5 opacity-60">{m === 'toggle' ? '点开始/停止' : '长按录音'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)] min-h-[48px]">
                <input
                  type="checkbox"
                  checked={settings.autoSendVoice}
                  onChange={(e) => onUpdate({ autoSendVoice: e.target.checked })}
                  className="accent-[var(--accent)] scale-125"
                />
                语音输入后自动发送
              </label>

              <div>
                <label className="text-sm text-[var(--text-muted)]">背景图片</label>
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] cursor-pointer hover:border-[var(--accent-border)] transition-colors min-h-[48px]">
                    📷 从相册选择
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxW = 800;
                            const scale = Math.min(1, maxW / img.width);
                            canvas.width = img.width * scale;
                            canvas.height = img.height * scale;
                            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                            const compressed = canvas.toDataURL('image/jpeg', 0.6);
                            onUpdate({ backgroundImage: compressed });
                          };
                          img.src = dataUrl;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {settings.backgroundImage && (
                    <button
                      onClick={() => onUpdate({ backgroundImage: undefined })}
                      className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 min-h-[48px]"
                    >
                      清除
                    </button>
                  )}
                </div>
                {settings.backgroundImage && (
                  <div className="mt-2 w-full h-20 rounded-xl bg-cover bg-center border border-[var(--border)]" style={{ backgroundImage: `url(${settings.backgroundImage})` }} />
                )}
              </div>
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

        <div className="shrink-0 p-4 border-t border-[var(--border)] text-center space-y-2 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">
              MiMo Pad Agent v2.0
            </span>
            <UpdateChecker />
          </div>
        </div>
      </div>
    </div>
  );
}
