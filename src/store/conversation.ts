import { create } from 'zustand';
import type { Conversation, ChatMessage } from '../types';
import { storage } from '../services/storage';
import { nanoid } from 'nanoid';

interface ConversationState {
  conversations: Conversation[];
  activeId: string | null;
  generating: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  create: (modelId: string, providerId: string, systemPrompt: string) => string;
  delete: (id: string) => void;
  setActive: (id: string) => void;
  rename: (id: string, title: string) => void;
  addMessage: (convId: string, message: ChatMessage) => void;
  updateMessage: (convId: string, messageId: string, partial: Partial<ChatMessage>) => void;
  setGenerating: (v: boolean) => void;
  getActive: () => Conversation | undefined;
  exportConversation: (id: string) => string;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeId: null,
  generating: false,
  loaded: false,

  async load() {
    const conversations = await storage.getAllConversations();
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    set({
      conversations,
      activeId: conversations[0]?.id ?? null,
      loaded: true,
    });
  },

  create(modelId, providerId, systemPrompt) {
    const id = nanoid();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: '新对话',
      messages: [],
      modelId,
      providerId,
      systemPrompt,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeId: id,
    }));
    storage.saveConversation(conv);
    return id;
  },

  delete(id) {
    set((s) => {
      const filtered = s.conversations.filter((c) => c.id !== id);
      return {
        conversations: filtered,
        activeId: s.activeId === id ? (filtered[0]?.id ?? null) : s.activeId,
      };
    });
    storage.deleteConversation(id);
  },

  setActive(id) {
    set({ activeId: id });
  },

  rename(id, title) {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      ),
    }));
    const conv = get().conversations.find((c) => c.id === id);
    if (conv) storage.saveConversation(conv);
  },

  addMessage(convId, message) {
    set((s) => {
      const conversations = s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const updated = {
          ...c,
          messages: [...c.messages, message],
          updatedAt: Date.now(),
        };
        if (c.messages.length === 0 && message.role === 'user') {
          updated.title = message.content.slice(0, 40) || '新对话';
        }
        return updated;
      });
      return { conversations };
    });
    const conv = get().conversations.find((c) => c.id === convId);
    if (conv) storage.saveConversation(conv);
  },

  updateMessage(convId, messageId, partial) {
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== convId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, ...partial } : m
          ),
          updatedAt: Date.now(),
        };
      }),
    }));
  },

  setGenerating(v) {
    set({ generating: v });
  },

  getActive() {
    const { conversations, activeId } = get();
    return conversations.find((c) => c.id === activeId);
  },

  exportConversation(id) {
    const conv = get().conversations.find((c) => c.id === id);
    if (!conv) return '';
    const lines: string[] = [];
    lines.push(`# ${conv.title}`);
    lines.push(`> Model: ${conv.modelId} | ${new Date(conv.createdAt).toLocaleString()}`);
    lines.push('');
    for (const msg of conv.messages) {
      const role = msg.role === 'user' ? '## 你' : msg.role === 'assistant' ? '## AI' : `## ${msg.role}`;
      lines.push(role);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }
    return lines.join('\n');
  },
}));
