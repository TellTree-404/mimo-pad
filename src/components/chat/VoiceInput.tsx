import { Mic, MicOff, X } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import type { AppSettings } from '../../types';

interface VoiceInputProps {
  mode: AppSettings['voiceInputMode'];
  autoSend: boolean;
  onResult: (text: string) => void;
  onSend: () => void;
}

export function VoiceInput({ mode, autoSend, onResult, onSend }: VoiceInputProps) {
  const {
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
    toggle,
    supported,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      onResult(text);
      if (isFinal && autoSend) {
        setTimeout(onSend, 500);
      }
    },
    onError: (err) => {
      console.warn('Speech error:', err);
    },
  });

  if (!supported) return null;

  const displayText = transcript + interimTranscript;

  return (
    <div className="relative">
      {isListening && (
        <div className="mb-2 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent-border)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--accent-light)] font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
              正在聆听...
            </span>
            {mode === 'toggle' && (
              <button
                onClick={stop}
                className="p-1 rounded hover:bg-red-500/20 text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            {displayText || '请说话...'}
          </p>
        </div>
      )}

      <button
        onTouchStart={mode === 'hold' ? start : undefined}
        onTouchEnd={mode === 'hold' ? stop : undefined}
        onMouseDown={mode === 'hold' ? start : undefined}
        onMouseUp={mode === 'hold' ? stop : undefined}
        onClick={mode === 'toggle' ? toggle : undefined}
        className={`p-2.5 rounded-lg transition-all active:scale-90 ${
          isListening
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-bg)]'
        } border border-transparent`}
        title={isListening ? '停止录音' : mode === 'hold' ? '按住录音' : '开始录音'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
    </div>
  );
}
