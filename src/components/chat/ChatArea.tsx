import type { Conversation, ProviderConfig, AppSettings } from '../../types';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { Zap } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  generating: boolean;
  cacheHitTokens: number;
  onSend: (text: string) => void;
  onModelChange: (providerId: string, modelId: string) => void;
}

export function ChatArea({
  conversation,
  providers,
  activeProviderId,
  activeModelId,
  settings,
  generating,
  cacheHitTokens,
  onSend,
  onModelChange,
}: ChatAreaProps) {
  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">
      <MessageList messages={messages} generating={generating} />
      {cacheHitTokens > 0 && (
        <div className="flex items-center gap-1 px-4 py-1 text-xs text-green-500 bg-green-500/10">
          <Zap size={12} />
          <span>KV Cache 命中 ~{cacheHitTokens.toLocaleString()} tokens (节省费用)</span>
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
