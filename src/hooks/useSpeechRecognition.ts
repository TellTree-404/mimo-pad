import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  supported: boolean;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionResult {
  const { lang = 'zh-CN', continuous = true, interimResults = true, onResult, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const getRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionCtor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as
        (new () => { continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; start(): void; stop(): void }) | undefined;
      if (!SpeechRecognitionCtor) return null;
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; length: number; [key: number]: { transcript: string } } } }) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          finalTranscriptRef.current += final;
          setTranscript(finalTranscriptRef.current);
          onResult?.(finalTranscriptRef.current, true);
        }
        setInterimTranscript(interim as unknown as string);
        if (interim) {
          onResult?.(finalTranscriptRef.current + interim, false);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        setIsListening(false);
        const messages: Record<string, string> = {
          'no-speech': '未检测到语音',
          'aborted': '语音输入已中止',
          'audio-capture': '无法访问麦克风',
          'network': '网络错误',
          'not-allowed': '麦克风权限被拒绝',
          'service-not-allowed': '语音服务不可用',
          'bad-grammar': '语法错误',
          'language-not-supported': '不支持该语言',
        };
        onError?.(messages[event.error] || event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    return recognitionRef.current;
  }, [continuous, interimResults, lang, onResult, onError]);

  const start = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition) {
      onError?.('浏览器不支持语音识别');
      return;
    }
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('' as unknown as string);
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      onError?.('语音识别启动失败');
    }
  }, [getRecognition, onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    start,
    stop,
    toggle,
    supported,
  };
}
