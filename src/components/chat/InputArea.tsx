import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import type { ProviderConfig, AppSettings, ThinkingLevel } from '../../types';
import { estimateTokens } from '../../services/llm';
import { VoiceInput } from './VoiceInput';

interface InputAreaProps {
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  disabled: boolean;
  thinkingLevel: ThinkingLevel;
  onSend: (text: string) => void;
  onModelChange: (providerId: string, modelId: string) => void;
  onThinkingChange: (level: ThinkingLevel) => void;
}

const THINKING_LEVELS: { value: ThinkingLevel; label: string; emoji: string; desc: string }[] = [
  { value: 'auto', label: '自动', emoji: '🧠', desc: '模型自决' },
  { value: 'off', label: '关闭', emoji: '💨', desc: '快速回复' },
  { value: 'low', label: '低', emoji: '🧠', desc: '简单编码' },
  { value: 'medium', label: '中', emoji: '🧠', desc: '一般任务' },
  { value: 'high', label: '高', emoji: '🧠', desc: '复杂重构' },
  { value: 'max', label: '最大', emoji: '🧠', desc: '架构设计' },
];

export function InputArea({
  providers,
  activeProviderId,
  activeModelId,
  settings,
  disabled,
  thinkingLevel,
  onSend,
  onModelChange,
  onThinkingChange,
}: InputAreaProps) {
  const [text, setText] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenCount = estimateTokens(text);

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const activeModel = activeProvider?.models.find((m) => m.id === activeModelId);
  const currentThinking = THINKING_LEVELS.find((l) => l.value === thinkingLevel) || THINKING_LEVELS[0];

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

  useEffect(() => { adjustHeight(); }, [text, adjustHeight]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceResult = (voiceText: string) => { setText(voiceText); };
  const handleVoiceSend = () => { if (text.trim()) handleSend(); };
  const handleVoiceActivate = useCallback(() => { textareaRef.current?.blur(); }, []);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-end gap-3">
          <VoiceInput
            mode={settings.voiceInputMode}
            autoSend={settings.autoSendVoice}
            onResult={handleVoiceResult}
            onSend={handleVoiceSend}
            onActivate={handleVoiceActivate}
          />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送)"
              rows={1}
              disabled={disabled}
              className="w-full px-5 py-3.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none text-base min-h-[52px] max-h-[160px]"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="p-4 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all active:scale-90 min-w-[52px] min-h-[52px]"
            title="发送"
          >
            <Send size={22} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={() => { setShowModels(!showModels); setShowThinking(false); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-border)] transition-colors min-h-[42px]"
            >
              <span className="max-w-[100px] truncate">{activeModel?.name || '选择模型'}</span>
              <ChevronDown size={14} />
            </button>

            {showModels && (
              <div className="absolute bottom-full left-0 mb-1 w-72 max-h-60 overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg z-20">
                {providers.map((provider) => (
                  <div key={provider.id}>
                    <div className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase bg-[var(--bg-tertiary)]">
                      {provider.name}
                    </div>
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => { onModelChange(provider.id, model.id); setShowModels(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          activeProviderId === provider.id && activeModelId === model.id
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {model.name}
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                          {model.supportsTools ? '工具' : ''}{model.supportsVision ? ' 视觉' : ''}{model.supportsReasoning ? ' 推理' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="text-[10px] text-[var(--text-muted)]">~{tokenCount} tokens</span>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowThinking(!showThinking); setShowModels(false); }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-border)] transition-colors min-h-[42px]"
          >
            <span className="text-base">{currentThinking.emoji}</span>
            <span className="font-medium">{currentThinking.label}</span>
            <ChevronDown size={14} />
          </button>

          {showThinking && (
            <div className="absolute bottom-full right-0 mb-1 w-48 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg z-20 py-1">
              {THINKING_LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => { onThinkingChange(l.value); setShowThinking(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                    thinkingLevel === l.value
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{l.emoji}</span>
                    {l.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">{l.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
