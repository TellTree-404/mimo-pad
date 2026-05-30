import type { Conversation, ProviderConfig, AppSettings } from '../../types';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

interface ChatAreaProps {
  conversation: Conversation | undefined;
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  settings: AppSettings;
  generating: boolean;
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
  onSend,
  onModelChange,
}: ChatAreaProps) {
  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]">
      <MessageList messages={messages} generating={generating} />
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
