import type { AppSettings } from '../../types';

interface MemoryPanelProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export function MemoryPanel({ settings, onUpdate }: MemoryPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">记忆 & 上下文</h3>

      <label className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-[var(--text-primary)]">启用长期记忆</div>
          <div className="text-[10px] text-[var(--text-muted)]">
            自动提取对话中的关键信息供后续使用
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.memoryEnabled}
          onChange={(e) => onUpdate({ memoryEnabled: e.target.checked })}
          className="accent-[var(--accent)] scale-125"
        />
      </label>

      <div>
        <label className="text-xs text-[var(--text-muted)]">
          最大记忆条目: {settings.maxMemoryEntries}
        </label>
        <input
          type="range"
          min={10}
          max={200}
          step={10}
          value={settings.maxMemoryEntries}
          onChange={(e) => onUpdate({ maxMemoryEntries: Number(e.target.value) })}
          className="w-full mt-1 accent-[var(--accent)]"
        />
      </div>

      <div>
        <label className="text-xs text-[var(--text-muted)]">
          上下文窗口大小: {settings.maxContextTokens.toLocaleString()} tokens
        </label>
        <input
          type="range"
          min={4000}
          max={128000}
          step={4000}
          value={settings.maxContextTokens}
          onChange={(e) => onUpdate({ maxContextTokens: Number(e.target.value) })}
          className="w-full mt-1 accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
          <span>4K</span>
          <span>128K</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-[var(--text-muted)]">默认系统提示词</label>
        <textarea
          value={settings.defaultSystemPrompt}
          onChange={(e) => onUpdate({ defaultSystemPrompt: e.target.value })}
          placeholder="自定义系统提示词..."
          rows={4}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none"
        />
      </div>

      <div className="pt-3 border-t border-[var(--border)]">
        <h4 className="text-xs font-medium text-[var(--text-muted)] mb-2">记忆管理</h4>
        <p className="text-[10px] text-[var(--text-muted)] mb-3">
          记忆系统会从你的对话中提取关键信息（项目名、技术栈、偏好等），并在后续对话中自动注入，让 AI 更了解你的上下文。
        </p>
      </div>
    </div>
  );
}
