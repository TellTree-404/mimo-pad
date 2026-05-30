import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, Brain, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const copyCode = () => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group/code my-2">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-t-lg border-b border-[var(--border)]">
          <span>{lang}</span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
      <pre className={`${lang ? 'rounded-t-none' : 'rounded-lg'} !mt-0`}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  if (isSystem) return null;

  return (
    <div className={`flex gap-3 px-4 py-3 animate-fade-in ${isUser ? 'justify-end' : ''}`}>
      {!isUser && !isTool && (
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0 mt-1">
          <Brain size={16} className="text-[var(--accent-light)]" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {isTool ? (
          <div className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5 mb-1 text-[var(--accent-light)]">
              <Wrench size={12} />
              <span className="font-medium text-xs">工具调用结果</span>
            </div>
            <div className="whitespace-pre-wrap break-all text-xs">{message.content.slice(0, 500)}{message.content.length > 500 ? '...' : ''}</div>
          </div>
        ) : isUser ? (
          <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-[var(--accent)] text-white">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {message.reasoning && (
              <details className="text-sm">
                <summary className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                  思考过程
                </summary>
                <div className="mt-1 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] text-xs whitespace-pre-wrap">
                  {message.reasoning}
                </div>
              </details>
            )}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent-border)]">
                <div className="flex items-center gap-1.5 mb-2 text-[var(--accent-light)] text-xs font-medium">
                  <Wrench size={12} />
                  调用工具
                </div>
                {message.toolCalls.map((tc) => (
                  <div key={tc.id} className="text-xs text-[var(--text-secondary)]">
                    <code className="!bg-transparent !text-[var(--accent-light)] text-xs">{tc.function.name}</code>
                    <pre className="mt-1 text-[10px] text-[var(--text-muted)] overflow-x-auto bg-[var(--bg-primary)] rounded p-1.5">
                      {JSON.stringify(JSON.parse(tc.function.arguments || '{}'), null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
            <div className="markdown-body text-[var(--text-primary)]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, [rehypeRaw, { tagfilter: false }]]}
                components={{
                  code({ className, children, ...props }: {
                    className?: string; children?: React.ReactNode;
                    inline?: boolean; node?: unknown;
                  }) {
                    const isInline = !className?.includes('language-');
                    if (isInline) {
                      return <code className={className} {...props}>{children}</code>;
                    }
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  },
                }}
              >
                {message.content || '...'}
              </ReactMarkdown>
            </div>
            {message.error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {message.error}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-sm font-bold">你</span>
        </div>
      )}
    </div>
  );
}
