import type { Conversation, ProviderConfig, AppSettings, AgentMode, ThinkingLevel } from '../../types';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ThinkingSelector } from './ThinkingSelector';
import { Search, Bot, Zap } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  generating: boolean;
  cacheHitTokens: number;
  agentMode: AgentMode;
  thinkingLevel: ThinkingLevel;
  onSend: (text: string) => void;
  onModelChange: (providerId: string, modelId: string) => void;
  onModeChange: (mode: AgentMode) => void;
  onThinkingChange: (level: ThinkingLevel) => void;
}

const MODE_CONFIG: Record<AgentMode, { label: string; icon: typeof Search; color: string; bg: string }> = {
  plan: { label: '计划', icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  agent: { label: '执行', icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  yolo: { label: 'YOLO', icon: Zap, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/40' },
};

export function ChatArea({
  conversation,
  providers,
  activeProviderId,
  activeModelId,
  settings,
  generating,
  cacheHitTokens,
  agentMode,
  thinkingLevel,
  onSend,
  onModelChange,
  onModeChange,
  onThinkingChange,
}: ChatAreaProps) {
  const messages = conversation?.messages ?? [];
  const mode = MODE_CONFIG[agentMode];
  const Icon = mode.icon;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">
      <div className={`flex items-center justify-between px-4 py-2 border-b ${mode.bg} gap-2 shrink-0`}>
        <div className="flex items-center gap-1">
          {(['plan', 'agent', 'yolo'] as AgentMode[]).map((m) => {
            const cfg = MODE_CONFIG[m];
            const CfgIcon = cfg.icon;
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[38px] ${
                  agentMode === m
                    ? `${cfg.bg} ${cfg.color}`
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <CfgIcon size={14} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {agentMode === 'plan' && (
            <span className="text-xs text-blue-400/70 hidden sm:inline">只读模式</span>
          )}
          {agentMode === 'yolo' && (
            <span className="text-xs text-red-400/70 hidden sm:inline">自动批准</span>
          )}
          <ThinkingSelector level={thinkingLevel} onChange={onThinkingChange} />
        </div>
      </div>

      <MessageList messages={messages} generating={generating} />

      {agentMode === 'plan' && (
        <div className="px-4 py-1.5 text-xs bg-blue-500/5 border-t border-blue-500/10 text-blue-400/80 text-center">
          计划模式 — AI 只能读取和分析，不会修改任何文件
        </div>
      )}

      {cacheHitTokens > 0 && (
        <div className="flex items-center gap-1 px-4 py-1 text-xs text-green-500 bg-green-500/10">
          <Zap size={12} />
          <span>KV Cache 命中 ~{cacheHitTokens.toLocaleString()} tokens</span>
        </div>
      )}

      <InputArea
        providers={providers}
        activeProviderId={activeProviderId}
        activeModelId={activeModelId}
        settings={settings}
        disabled={generating}
        onSend={onSend}
        onModelChange={onModelChange}
      />
    </div>
  );
}
