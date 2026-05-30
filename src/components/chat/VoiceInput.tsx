import { Mic, MicOff, X } from 'lucide-react';
import { useCallback } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import type { AppSettings } from '../../types';

interface VoiceInputProps {
  mode: AppSettings['voiceInputMode'];
  autoSend: boolean;
  onResult: (text: string) => void;
  onSend: () => void;
  onActivate?: () => void;
}

export function VoiceInput({ mode, autoSend, onResult, onSend, onActivate }: VoiceInputProps) {
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

  const handleStart = useCallback(() => {
    (document.activeElement as HTMLElement)?.blur();
    onActivate?.();
    start();
  }, [start, onActivate]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      handleStop();
    } else {
      handleStart();
    }
  }, [isListening, handleStart, handleStop]);

  if (!supported) return null;

  const displayText = transcript + interimTranscript;

  return (
    <div className="relative">
      {isListening && (
        <div className="absolute bottom-full left-0 right-0 mb-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--accent-border)] shadow-lg z-10 min-w-[240px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--accent-light)] font-medium flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse-dot" />
              正在聆听...
            </span>
            {mode === 'toggle' && (
              <button
                onClick={handleStop}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="text-base text-[var(--text-primary)]">
            {displayText || '请说话...'}
          </p>
        </div>
      )}

      <button
        onTouchStart={(e) => {
          if (mode === 'hold') { e.preventDefault(); handleStart(); }
        }}
        onTouchEnd={(e) => {
          if (mode === 'hold') { e.preventDefault(); handleStop(); }
        }}
        onMouseDown={(e) => {
          if (mode === 'hold') { e.preventDefault(); handleStart(); }
        }}
        onMouseUp={(e) => {
          if (mode === 'hold') { e.preventDefault(); handleStop(); }
        }}
        onClick={mode === 'toggle' ? handleToggle : undefined}
        type="button"
        className={`p-3.5 rounded-2xl transition-all active:scale-90 border-2 min-w-[50px] min-h-[50px] ${
          isListening
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-bg)] border-transparent'
        }`}
        title={isListening ? '停止录音' : mode === 'hold' ? '按住录音' : '开始录音'}
      >
        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
    </div>
  );
}
