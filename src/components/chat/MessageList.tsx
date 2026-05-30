import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  generating: boolean;
}

export function MessageList({ messages, generating }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, generating]);

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3 px-6">
          <div className="text-4xl opacity-30 select-none">MiMo Pad</div>
          <p className="text-sm text-center">
            选择一个模型并输入消息开始对话
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['解释这段代码', '写一个快速排序', '帮我调试一个Bug', '生成一个React组件'].map((q) => (
              <span key={q} className="px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] cursor-default">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {generating && <ThinkingIndicator />}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
