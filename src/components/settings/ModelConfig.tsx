import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ProviderConfig, ModelConfig as ModelConfigType } from '../../types';
import { nanoid } from 'nanoid';

interface ModelConfigProps {
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  onUpdateProvider: (id: string, partial: Partial<ProviderConfig>) => void;
  onSetApiKey: (id: string, key: string) => void;
  onSetActiveModel: (providerId: string, modelId: string) => void;
  onAddProvider: (provider: ProviderConfig) => void;
  onRemoveProvider: (id: string) => void;
}

export function ModelConfig({
  providers,
  activeProviderId,
  activeModelId,
  onUpdateProvider,
  onSetApiKey,
  onSetActiveModel,
  onAddProvider,
  onRemoveProvider,
}: ModelConfigProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showAddCustom, setShowAddCustom] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customKey, setCustomKey] = useState('');

  const colors: Record<string, string> = {
    deepseek: '#4d6bfe',
    mimo: '#ff6900',
    custom: '#888',
  };

  const handleAddCustom = () => {
    if (!customName.trim() || !customBaseUrl.trim() || !customModel.trim()) return;
    const id = nanoid(8);
    onAddProvider({
      id,
      name: customName.trim(),
      type: 'custom',
      baseUrl: customBaseUrl.trim().replace(/\/$/, ''),
      apiKey: customKey.trim(),
      models: [{
        id: customModel.trim(),
        name: customModel.trim(),
        maxTokens: 128000,
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: false,
        supportsReasoning: false,
      }],
      authHeader: 'Authorization',
      authPrefix: 'Bearer ',
    });
    if (customKey.trim()) {
      onSetApiKey(id, customKey.trim());
    }
    setCustomName('');
    setCustomBaseUrl('');
    setCustomModel('');
    setCustomKey('');
    setShowAddCustom(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">模型 & API</h3>

      {providers.map((provider) => {
        const isBuiltin = provider.id === 'deepseek' || provider.id === 'mimo';
        return (
          <div key={provider.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors min-h-[52px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[provider.type] || '#888' }}
                />
                <div className="text-left">
                  <div className="text-base font-medium text-[var(--text-primary)]">{provider.name}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{provider.baseUrl}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isBuiltin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveProvider(provider.id); }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400"
                  >
                    <X size={16} />
                  </button>
                )}
                <span className="text-sm">{expandedId === provider.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedId === provider.id && (
              <div className="px-5 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div>
                  <label className="text-sm text-[var(--text-muted)]">API Key</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={provider.apiKey}
                      onChange={(e) => onSetApiKey(provider.id, e.target.value)}
                      placeholder="输入 API Key..."
                      className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[48px]"
                    />
                    <button
                      onClick={() => setShowKeys((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
                      className="px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[48px]"
                    >
                      {showKeys[provider.id] ? '隐藏' : '显示'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-[var(--text-muted)]">模型</label>
                  <div className="mt-1 space-y-1.5">
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => onSetActiveModel(provider.id, model.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors min-h-[48px] ${
                          activeProviderId === provider.id && activeModelId === model.id
                            ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent-border)] text-[var(--accent-light)]'
                            : 'bg-[var(--bg-tertiary)] border-2 border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]'
                        }`}
                      >
                        <div className="font-medium text-base">{model.name}</div>
                        <div className="flex gap-2 mt-1">
                          {model.supportsTools && <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-hover)]">工具</span>}
                          {model.supportsVision && <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-hover)]">视觉</span>}
                          {model.supportsReasoning && <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-hover)]">推理</span>}
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-hover)]">{model.maxTokens >= 1000000 ? `${(model.maxTokens / 1000000).toFixed(1)}M` : `${Math.round(model.maxTokens / 1000)}K`}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2">
        {!showAddCustom ? (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:border-[var(--accent-border)] transition-colors text-sm min-h-[48px]"
          >
            <Plus size={18} />
            添加自定义 API
          </button>
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--bg-tertiary)] space-y-3">
            <input
              type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
              placeholder="名称 (如: 我的API)"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[48px]"
            />
            <input
              type="text" value={customBaseUrl} onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="Base URL (如: https://api.example.com/v1)"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[48px]"
            />
            <input
              type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)}
              placeholder="模型名 (如: gpt-4o)"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[48px]"
            />
            <input
              type="password" value={customKey} onChange={(e) => setCustomKey(e.target.value)}
              placeholder="API Key"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] min-h-[48px]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustom}
                className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-light)] transition-colors min-h-[48px]"
              >
                添加
              </button>
              <button
                onClick={() => setShowAddCustom(false)}
                className="px-6 py-3 rounded-xl bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-colors min-h-[48px]"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
