import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import type { ProviderConfig, AppSettings } from '../../types';
import { estimateTokens } from '../../services/llm';
import { VoiceInput } from './VoiceInput';

interface InputAreaProps {
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  disabled: boolean;
  onSend: (text: string) => void;
  onModelChange: (providerId: string, modelId: string) => void;
}

export function InputArea({
  providers,
  activeProviderId,
  activeModelId,
  settings,
  disabled,
  onSend,
  onModelChange,
}: InputAreaProps) {
  const [text, setText] = useState('');
  const [showModels, setShowModels] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenCount = estimateTokens(text);

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const activeModel = activeProvider?.models.find((m) => m.id === activeModelId);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

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

  const handleVoiceResult = (voiceText: string) => {
    setText(voiceText);
  };

  const handleVoiceSend = () => {
    if (text.trim()) {
      handleSend();
    }
  };

  const handleVoiceActivate = useCallback(() => {
    textareaRef.current?.blur();
  }, []);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 pb-safe">
      <div className="flex items-center gap-3 mb-2.5">
        <div className="relative">
          <button
            onClick={() => setShowModels(!showModels)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-border)] transition-colors min-h-[42px]"
          >
            <span className="max-w-[120px] truncate">{activeModel?.name || '选择模型'}</span>
            <ChevronDown size={14} />
          </button>

          {showModels && (
            <div className="absolute bottom-full left-0 mb-1 w-72 max-h-60 overflow-y-auto rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg z-20">
              {providers.map((provider) => (
                <div key={provider.id}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase bg-[var(--bg-tertiary)]">
                    {provider.name}
                  </div>
                  {provider.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(provider.id, model.id);
                        setShowModels(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
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

        <div className="flex-1" />

        <span className="text-[10px] text-[var(--text-muted)] min-w-[50px] text-right">
          ~{tokenCount} tokens
        </span>
      </div>

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
            className="w-full px-5 py-3.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none text-base min-h-[50px] max-h-[180px]"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="p-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all active:scale-90 min-w-[50px] min-h-[50px]"
          title="发送"
        >
          <Send size={22} />
        </button>
      </div>
    </div>
  );
}
