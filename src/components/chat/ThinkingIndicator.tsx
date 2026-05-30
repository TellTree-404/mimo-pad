export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0 mt-1">
        <span className="text-[var(--accent-light)] text-lg">...</span>
      </div>
      <div className="flex items-center gap-1 px-4 py-2.5 rounded-2xl rounded-bl-md bg-[var(--bg-tertiary)]">
        <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-pulse-dot" style={{ animationDelay: '0s' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}
