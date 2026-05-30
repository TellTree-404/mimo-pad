import { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, PanelLeft } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useSettingsStore } from './store/settings';
import { useConversationStore } from './store/conversation';
import { useMcpStore } from './store/mcp';
import { chatCompletion, estimateTokens } from './services/llm';
import { mcpManager, getToolsForProvider } from './services/mcp';
import { buildMemoryContext, extractKeyInsights, manageContextWindow } from './services/memory';
import { Sidebar } from './components/sidebar/Sidebar';
import { ConversationList } from './components/sidebar/ConversationList';
import { ChatArea } from './components/chat/ChatArea';
import { SettingsPanel } from './components/settings/SettingsPanel';
import type { ChatMessage, ToolCall, ProviderConfig, McpServerConfig } from './types';

function App() {
  const {
    settings,
    loaded: settingsLoaded,
    load: loadSettings,
    save: saveSettings,
    updateSettings,
    updateProvider,
    setApiKey,
    setActiveModel,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
    reset: resetSettings,
  } = useSettingsStore();

  const {
    conversations,
    activeId,
    generating,
    loaded: convLoaded,
    load: loadConversations,
    create: createConversation,
    delete: deleteConversation,
    setActive: setActiveConversation,
    addMessage,
    updateMessage,
    setGenerating,
    getActive,
    exportConversation,
  } = useConversationStore();

  const { connectedIds, connect, disconnect, toggle: toggleMcp } = useMcpStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadSettings();
    loadConversations();
  }, []);

  useEffect(() => {
    if (settingsLoaded) {
      const connected = settings.mcpServers.filter((s) => s.enabled);
      for (const srv of connected) {
        connect(srv).catch(() => {});
      }
    }
  }, [settingsLoaded]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : settings.theme
    );
    document.documentElement.style.fontSize = settings.fontSize + 'px';
  }, [settings.theme, settings.fontSize]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getEffectiveProviders = useCallback(() => {
    return settings.providers.map((p: ProviderConfig) => ({
      ...p,
      apiKey: p.apiKey || settings.providers.find((pp: ProviderConfig) => pp.id === p.id)?.apiKey || '',
    }));
  }, [settings.providers]);

  const activeConv = conversations.find((c) => c.id === activeId);

  const handleNewConversation = useCallback(() => {
    createConversation(settings.activeModelId, settings.activeProviderId, settings.defaultSystemPrompt);
    setSidebarOpen(false);
  }, [settings.activeModelId, settings.activeProviderId, settings.defaultSystemPrompt]);

  const handleSend = useCallback(async (text: string) => {
    let convId = activeId;
    if (!convId) {
      convId = createConversation(settings.activeModelId, settings.activeProviderId, settings.defaultSystemPrompt);
    }

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      tokenCount: estimateTokens(text),
    };
    addMessage(convId, userMsg);

    setGenerating(true);
    const aiMsgId = nanoid();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(convId, aiMsg);

    try {
      const conv = getActive();
      if (!conv) return;

      const activeProvider = settings.providers.find((p: ProviderConfig) => p.id === settings.activeProviderId);
      if (!activeProvider || !activeProvider.apiKey) {
        updateMessage(convId, aiMsgId, {
          content: '',
          error: '请先在设置中配置 API Key',
        });
        return;
      }

      const enabledMcpIds = settings.mcpServers
        .filter((s: McpServerConfig) => connectedIds.includes(s.id))
        .map((s: McpServerConfig) => s.id);

      const tools = enabledMcpIds.length > 0 ? getToolsForProvider(enabledMcpIds) : undefined;

      let allMessages = [...conv.messages];

      if (settings.memoryEnabled) {
        const memCtx = await buildMemoryContext(conv.id);
        if (memCtx) {
          const existingSystem = allMessages.find((m: ChatMessage) => m.role === 'system');
          if (!existingSystem) {
            const msgWithMemory = settings.defaultSystemPrompt
              ? settings.defaultSystemPrompt + memCtx
              : 'You are an AI coding assistant.' + memCtx;
            allMessages = [{ id: 'system-1', role: 'system', content: msgWithMemory, timestamp: 0 }, ...allMessages];
          }
        }
      } else if (settings.defaultSystemPrompt && !allMessages.find((m: ChatMessage) => m.role === 'system')) {
        allMessages = [{ id: 'system-1', role: 'system', content: settings.defaultSystemPrompt, timestamp: 0 }, ...allMessages];
      }

      let currentMessages = manageContextWindow(allMessages, settings.maxContextTokens);

      let maxIterations = 5;
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        const apiMessages = currentMessages
          .filter((m: ChatMessage) => m.role !== 'tool')
          .map((m: ChatMessage) => {
            const entry: Record<string, unknown> = { role: m.role, content: m.content };
            if (m.reasoning) entry.reasoning_content = m.reasoning;
            if (m.toolCalls) entry.tool_calls = m.toolCalls.map((tc: ToolCall) => ({ id: tc.id, type: 'function', function: tc.function }));
            return entry;
          });

        const toolResults = currentMessages.filter((m: ChatMessage) => m.role === 'tool');
        for (const tr of toolResults) {
          apiMessages.push({
            role: 'tool',
            content: tr.content,
            tool_call_id: tr.id,
          });
        }

        let streamedContent = '';
        let streamedReasoning = '';
        const streamedToolCalls: ToolCall[] = [];

        const stream = chatCompletion({
          provider: activeProvider,
          model: settings.activeModelId,
          messages: apiMessages as { role: string; content: string; reasoning_content?: string; tool_calls?: unknown[]; tool_call_id?: string }[],
          systemPrompt: settings.defaultSystemPrompt || undefined,
          tools: iteration === 1 && tools ? tools : undefined,
          maxTokens: 4096,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.content) {
            streamedContent += chunk.content;
            updateMessage(convId, aiMsgId, {
              content: streamedContent,
              reasoning: streamedReasoning || undefined,
            });
          }
          if (chunk.reasoning) {
            streamedReasoning += chunk.reasoning;
            updateMessage(convId, aiMsgId, {
              content: streamedContent,
              reasoning: streamedReasoning,
            });
          }
          if (chunk.toolCalls) {
            streamedToolCalls.push(...chunk.toolCalls);
          }
          if (chunk.usage) {
            updateMessage(convId, aiMsgId, { tokenCount: chunk.usage.totalTokens });
          }
        }

        if (streamedToolCalls.length > 0) {
          if (streamedContent) {
            updateMessage(convId, aiMsgId, { toolCalls: streamedToolCalls });
          } else {
            updateMessage(convId, aiMsgId, {
              content: '调用工具中...',
              toolCalls: streamedToolCalls,
            });
          }

          const toolResultMsgs: ChatMessage[] = [];

          for (const tc of streamedToolCalls) {
            try {
              const args = JSON.parse(tc.function.arguments || '{}');
              const result = await mcpManager.executeTool(tc.function.name, args);
              const trMsg: ChatMessage = {
                id: tc.id,
                role: 'tool',
                content: result.content,
                timestamp: Date.now(),
              };
              toolResultMsgs.push(trMsg);
              addMessage(convId, trMsg);
            } catch (e) {
              const trMsg: ChatMessage = {
                id: tc.id,
                role: 'tool',
                content: `Error: ${e instanceof Error ? e.message : String(e)}`,
                timestamp: Date.now(),
              };
              toolResultMsgs.push(trMsg);
              addMessage(convId, trMsg);
            }
          }

          const updatedConv = getActive();
          if (updatedConv) {
            currentMessages = [...updatedConv.messages];

            const newAiMsgId = nanoid();
            const newAiMsg: ChatMessage = {
              id: newAiMsgId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              reasoning: streamedReasoning || undefined,
              toolCalls: streamedToolCalls,
            };
            const existingAi = currentMessages.find((m: ChatMessage) => m.id === aiMsgId);
            if (existingAi) {
              const idx = currentMessages.indexOf(existingAi);
              currentMessages[idx] = newAiMsg;
            }
            currentMessages.push(...toolResultMsgs.map((m: ChatMessage) => m));

            const nextAiMsgId = nanoid();
            const nextAiMsg: ChatMessage = {
              id: nextAiMsgId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            };
            currentMessages.push(nextAiMsg);

            addMessage(convId, nextAiMsg);
            updateMessage(convId, nextAiMsgId, { content: '' });

            const nextApiMessages = currentMessages
              .filter((m: ChatMessage) => m.role !== 'tool')
              .map((m: ChatMessage) => {
                const entry: Record<string, unknown> = { role: m.role, content: m.content };
                if (m.reasoning) entry.reasoning_content = m.reasoning;
                if (m.toolCalls) entry.tool_calls = m.toolCalls.map((tc: ToolCall) => ({ id: tc.id, type: 'function', function: tc.function }));
                return entry;
              });
            const nextToolResults = currentMessages.filter((m: ChatMessage) => m.role === 'tool');
            for (const tr of nextToolResults) {
              nextApiMessages.push({ role: 'tool', content: tr.content, tool_call_id: tr.id });
            }

            streamedContent = '';
            streamedReasoning = '';

            const nextStream = chatCompletion({
              provider: activeProvider,
              model: settings.activeModelId,
              messages: nextApiMessages as { role: string; content: string; reasoning_content?: string; tool_calls?: unknown[]; tool_call_id?: string }[],
              systemPrompt: settings.defaultSystemPrompt || undefined,
              maxTokens: 4096,
              temperature: 0.7,
              stream: true,
            });

            for await (const chunk of nextStream) {
              if (chunk.content) {
                streamedContent += chunk.content;
                updateMessage(convId, nextAiMsgId, { content: streamedContent });
              }
              if (chunk.reasoning) {
                streamedReasoning += chunk.reasoning;
                updateMessage(convId, nextAiMsgId, { reasoning: streamedReasoning });
              }
              if (chunk.usage) {
                updateMessage(convId, nextAiMsgId, { tokenCount: chunk.usage.totalTokens });
              }
            }
            break;
          }

          break;
        }

        break;
      }

      if (settings.memoryEnabled) {
        const updatedConv = getActive();
        if (updatedConv) {
          extractKeyInsights(updatedConv.messages, updatedConv.id).catch(() => {});
        }
      }

      saveSettings();
    } catch (e) {
      updateMessage(convId, aiMsgId, {
        error: e instanceof Error ? e.message : '请求失败，请检查网络和 API Key',
      });
    } finally {
      setGenerating(false);
    }
  }, [
    activeId,
    settings,
    connectedIds,
    addMessage,
    updateMessage,
    setGenerating,
    getActive,
    createConversation,
    saveSettings,
    manageContextWindow,
    buildMemoryContext,
    extractKeyInsights,
  ]);

  if (!settingsLoaded || !convLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">加载中...</div>
      </div>
    );
  }

  const providers = getEffectiveProviders();

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(false)} onSettings={() => setSettingsOpen(true)}>
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveConversation(id); setSidebarOpen(false); }}
          onCreate={handleNewConversation}
          onDelete={deleteConversation}
          onExport={(id) => {
            const markdown = exportConversation(id);
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation-${id.slice(0, 8)}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
      </Sidebar>

      <div className="flex-1 flex flex-col relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-20 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Menu size={20} />
          </button>
        )}

        <ChatArea
          conversation={activeConv}
          providers={providers}
          activeProviderId={settings.activeProviderId}
          activeModelId={settings.activeModelId}
          settings={settings}
          generating={generating}
          onSend={handleSend}
          onModelChange={setActiveModel}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        connectedMcpIds={connectedIds}
        onUpdate={updateSettings}
        onUpdateProvider={updateProvider}
        onSetApiKey={setApiKey}
        onSetActiveModel={setActiveModel}
        onAddMcp={addMcpServer}
        onToggleMcp={toggleMcp}
        onRemoveMcp={removeMcpServer}
        onReset={resetSettings}
        onExport={() => {
          const all = conversations.map((c) => exportConversation(c.id)).join('\n\n---\n\n');
          const blob = new Blob([all], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mimo-pad-export-${new Date().toISOString().slice(0, 10)}.md`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      />
    </div>
  );
}

export default App;
