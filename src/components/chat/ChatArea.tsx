import type { Conversation, ProviderConfig, AppSettings, AgentMode, ThinkingLevel } from '../../types';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { Shield, Zap, Eye } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  generating: boolean;
  queuedMessage: string | null;
  cacheHitTokens: number;
  agentMode: AgentMode;
  thinkingLevel: ThinkingLevel;
  onSend: (text: string) => void;
  onCancel: () => void;
  onModelChange: (providerId: string, modelId: string) => void;
  onModeChange: (mode: AgentMode) => void;
  onThinkingChange: (level: ThinkingLevel) => void;
}

const MODE_CONFIG: Record<AgentMode, { label: string; icon: typeof Eye; gradient: string; text: string; glow: string }> = {
  plan: { label: '计划', icon: Eye, gradient: 'from-blue-600/20 to-blue-400/10', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
  agent: { label: '执行', icon: Shield, gradient: 'from-violet-600/20 to-violet-400/10', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
  yolo: { label: 'YOLO', icon: Zap, gradient: 'from-red-600/20 to-red-400/10', text: 'text-red-400', glow: 'shadow-red-500/20' },
};

export function ChatArea({
  conversation,
  providers,
  activeProviderId,
  activeModelId,
  settings,
  generating,
  queuedMessage,
  cacheHitTokens,
  agentMode,
  thinkingLevel,
  onSend,
  onCancel,
  onModelChange,
  onModeChange,
  onThinkingChange,
}: ChatAreaProps) {
  const messages = conversation?.messages ?? [];
  const mode = MODE_CONFIG[agentMode];
  const Icon = mode.icon;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="flex items-center justify-center px-3 py-2 gap-1.5 shrink-0 mt-2">
        {(['plan', 'agent', 'yolo'] as AgentMode[]).map((m) => {
          const cfg = MODE_CONFIG[m];
          const ModeIcon = cfg.icon;
          const isActive = agentMode === m;
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 min-h-[46px] ${
                isActive
                  ? `bg-gradient-to-r ${cfg.gradient} ${cfg.text} shadow-lg ${cfg.glow}`
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <ModeIcon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <MessageList messages={messages} generating={generating} />

      {agentMode === 'plan' && (
        <div className="mx-3 mb-1 px-3 py-2 rounded-xl text-xs bg-blue-500/8 border border-blue-500/15 text-blue-400/90 text-center backdrop-blur-sm">
          🔍 计划模式 — AI 只能读取和分析，不会修改任何文件
        </div>
      )}

      {queuedMessage && (
        <div className="mx-3 mb-1 px-3 py-2 rounded-xl text-xs bg-amber-500/8 border border-amber-500/15 text-amber-400/90 text-center flex items-center justify-center gap-2 backdrop-blur-sm">
          📩 队列中 — 完成后自动发送
        </div>
      )}

      {cacheHitTokens > 0 && (
        <div className="mx-3 mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-green-400 bg-green-500/8 border border-green-500/15 backdrop-blur-sm">
          <Zap size={12} />
          <span>缓存命中 ~{cacheHitTokens.toLocaleString()} tokens</span>
        </div>
      )}

      <InputArea
        providers={providers}
        activeProviderId={activeProviderId}
        activeModelId={activeModelId}
        settings={settings}
        disabled={false}
        generating={generating}
        thinkingLevel={thinkingLevel}
        onSend={onSend}
        onCancel={onCancel}
        onModelChange={onModelChange}
        onThinkingChange={onThinkingChange}
      />
    </div>
  );
}
