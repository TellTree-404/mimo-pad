import { create } from 'zustand';
import type { Conversation, ChatMessage, Project } from '../types';
import { storage } from '../services/storage';
import { nanoid } from 'nanoid';

interface ConversationState {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  generating: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  createProject: (name: string, description?: string) => string;
  deleteProject: (id: string) => void;
  updateProject: (id: string, partial: Partial<Project>) => void;
  create: (modelId: string, providerId: string, systemPrompt: string, projectId?: string, memoryShared?: boolean) => string;
  delete: (id: string) => void;
  setActive: (id: string) => void;
  rename: (id: string, title: string) => void;
  addMessage: (convId: string, message: ChatMessage) => void;
  updateMessage: (convId: string, messageId: string, partial: Partial<ChatMessage>) => void;
  setGenerating: (v: boolean) => void;
  getActive: () => Conversation | undefined;
  getProjectConversations: (projectId: string) => Conversation[];
  exportConversation: (id: string) => string;
  toggleMemorySharing: (convId: string) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  projects: [],
  activeId: null,
  generating: false,
  loaded: false,

  async load() {
    const conversations = await storage.getAllConversations();
    const projects = await storage.getAllProjects();
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    set({
      conversations,
      projects,
      activeId: conversations[0]?.id ?? null,
      loaded: true,
    });
  },

  createProject(name, description) {
    const id = nanoid();
    const project: Project = {
      id,
      name,
      description,
      systemPrompt: '',
      createdAt: Date.now(),
      memoryShared: true,
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    storage.saveProject(project);
    return id;
  },

  deleteProject(id) {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      conversations: s.conversations.map((c) =>
        c.projectId === id ? { ...c, projectId: undefined, memoryShared: false } : c
      ),
    }));
    storage.deleteProject(id);
    for (const c of get().conversations) {
      if (c.projectId === id) {
        storage.saveConversation({ ...c, projectId: undefined, memoryShared: false });
      }
    }
  },

  updateProject(id, partial) {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...partial } : p)),
    }));
    const p = get().projects.find((p) => p.id === id);
    if (p) storage.saveProject(p);
  },

  create(modelId, providerId, systemPrompt, projectId, memoryShared = true) {
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
      memoryShared,
      projectId,
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

  getProjectConversations(projectId) {
    return get().conversations.filter((c) => c.projectId === projectId);
  },

  exportConversation(id) {
    const conv = get().conversations.find((c) => c.id === id);
    if (!conv) return '';
    const lines: string[] = [];
    lines.push(`# ${conv.title}`);
    lines.push(`> Model: ${conv.modelId} | Memory: ${conv.memoryShared ? 'shared' : 'isolated'} | ${new Date(conv.createdAt).toLocaleString()}`);
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

  toggleMemorySharing(convId) {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, memoryShared: !c.memoryShared, updatedAt: Date.now() } : c
      ),
    }));
    const conv = get().conversations.find((c) => c.id === convId);
    if (conv) storage.saveConversation(conv);
  },
}));
