import type { ThinkingLevel } from '../../types';

interface ThinkingSelectorProps {
  level: ThinkingLevel;
  onChange: (level: ThinkingLevel) => void;
}

const LEVELS: { value: ThinkingLevel; label: string; icon: string; desc: string }[] = [
  { value: 'auto', label: '自动', icon: '', desc: '模型自决' },
  { value: 'off', label: '关闭', icon: '', desc: '快速回复' },
  { value: 'low', label: '低', icon: '', desc: '简单编码' },
  { value: 'medium', label: '中', icon: '', desc: '一般任务' },
  { value: 'high', label: '高', icon: '', desc: '复杂重构' },
  { value: 'max', label: '最大', icon: '', desc: '架构设计' },
];

export function ThinkingSelector({ level, onChange }: ThinkingSelectorProps) {
  const current = LEVELS.find((l) => l.value === level) || LEVELS[0];

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:border-[var(--accent-border)] transition-colors min-h-[40px]"
        title="思考强度"
      >
        <span>🧠</span>
        <span>{current.label}</span>
      </button>
      <div className="absolute top-full right-0 mt-1 w-40 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-lg z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
        <div className="py-1">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => onChange(l.value)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                level === l.value
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-light)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span>{l.icon} {l.label}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{l.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
