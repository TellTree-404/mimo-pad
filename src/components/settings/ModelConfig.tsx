import { useState } from 'react';
import type { ProviderConfig } from '../../types';

interface ModelConfigProps {
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  onUpdateProvider: (id: string, partial: Partial<ProviderConfig>) => void;
  onSetApiKey: (id: string, key: string) => void;
  onSetActiveModel: (providerId: string, modelId: string) => void;
}

export function ModelConfig({
  providers,
  activeProviderId,
  activeModelId,
  onUpdateProvider,
  onSetApiKey,
  onSetActiveModel,
}: ModelConfigProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">模型与 API 配置</h3>

      {providers.map((provider) => (
        <div
          key={provider.id}
          className="rounded-lg border border-[var(--border)] overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === provider.id ? null : provider.id)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full"
                style={{ backgroundColor: provider.type === 'openai' ? '#10a37f' : provider.type === 'anthropic' ? '#d97757' : provider.type === 'mimo' ? '#ff6900' : provider.type === 'deepseek' ? '#4d6bfe' : '#888' }}
              />
              <div className="text-left">
                <div className="text-sm font-medium text-[var(--text-primary)]">{provider.name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{provider.baseUrl}</div>
              </div>
            </div>
            <span className={`text-xs transition-transform ${expandedId === provider.id ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {expandedId === provider.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">API Key</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type={showKeys[provider.id] ? 'text' : 'password'}
                    value={provider.apiKey}
                    onChange={(e) => onSetApiKey(provider.id, e.target.value)}
                    placeholder="输入 API Key..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)]"
                  />
                  <button
                    onClick={() => setShowKeys((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
                    className="px-2 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {showKeys[provider.id] ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)]">模型</label>
                <div className="mt-1 space-y-1">
                  {provider.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => onSetActiveModel(provider.id, model.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeProviderId === provider.id && activeModelId === model.id
                          ? 'bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent-light)]'
                          : 'bg-[var(--bg-tertiary)] border border-transparent text-[var(--text-secondary)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="flex gap-2 mt-0.5">
                        {model.supportsTools && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">工具</span>}
                        {model.supportsVision && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">视觉</span>}
                        {model.supportsReasoning && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">推理</span>}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)]">{model.maxTokens / 1000}K</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
