import { create } from 'zustand';
import type { AppSettings, ProviderConfig, ModelConfig, McpServerConfig } from '../types';
import { storage, DEFAULT_SETTINGS } from '../services/storage';

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => void;
  save: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateProvider: (id: string, partial: Partial<ProviderConfig>) => void;
  addProvider: (provider: ProviderConfig) => void;
  removeProvider: (id: string) => void;
  setApiKey: (providerId: string, key: string) => void;
  setActiveModel: (providerId: string, modelId: string) => void;
  addMcpServer: (server: McpServerConfig) => void;
  updateMcpServer: (id: string, partial: Partial<McpServerConfig>) => void;
  removeMcpServer: (id: string) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  load() {
    const saved = storage.getSettings();
    if (saved) {
      for (const p of saved.providers) {
        p.apiKey = storage.getApiKey(p.id);
      }
      set({ settings: saved, loaded: true });
    } else {
      const settings = { ...DEFAULT_SETTINGS };
      for (const p of settings.providers) {
        p.apiKey = storage.getApiKey(p.id);
      }
      set({ settings, loaded: true });
    }
  },

  save() {
    const { settings } = get();
    const toSave = { ...settings };
    for (const p of toSave.providers) {
      storage.saveApiKey(p.id, p.apiKey);
    }
    const cleaned = {
      ...toSave,
      providers: toSave.providers.map((p) => ({ ...p, apiKey: '' })),
    };
    storage.saveSettings(cleaned);
    set({ settings: toSave });
  },

  updateSettings(partial) {
    set((s) => ({
      settings: { ...s.settings, ...partial },
    }));
  },

  updateProvider(id, partial) {
    set((s) => ({
      settings: {
        ...s.settings,
        providers: s.settings.providers.map((p) =>
          p.id === id ? { ...p, ...partial } : p
        ),
      },
    }));
  },

  addProvider(provider) {
    set((s) => ({
      settings: {
        ...s.settings,
        providers: [...s.settings.providers, provider],
      },
    }));
  },

  removeProvider(id) {
    set((s) => ({
      settings: {
        ...s.settings,
        providers: s.settings.providers.filter((p) => p.id !== id),
        activeProviderId:
          s.settings.activeProviderId === id
            ? s.settings.providers[0]?.id ?? ''
            : s.settings.activeProviderId,
      },
    }));
    storage.saveApiKey(id, '');
  },

  setApiKey(providerId, key) {
    set((s) => ({
      settings: {
        ...s.settings,
        providers: s.settings.providers.map((p) =>
          p.id === providerId ? { ...p, apiKey: key } : p
        ),
      },
    }));
    storage.saveApiKey(providerId, key);
  },

  setActiveModel(providerId, modelId) {
    set((s) => ({
      settings: {
        ...s.settings,
        activeProviderId: providerId,
        activeModelId: modelId,
      },
    }));
  },

  addMcpServer(server) {
    set((s) => ({
      settings: {
        ...s.settings,
        mcpServers: [...s.settings.mcpServers, server],
      },
    }));
  },

  updateMcpServer(id, partial) {
    set((s) => ({
      settings: {
        ...s.settings,
        mcpServers: s.settings.mcpServers.map((srv) =>
          srv.id === id ? { ...srv, ...partial } : srv
        ),
      },
    }));
  },

  removeMcpServer(id) {
    set((s) => ({
      settings: {
        ...s.settings,
        mcpServers: s.settings.mcpServers.filter((srv) => srv.id !== id),
      },
    }));
  },

  reset() {
    storage.clearAll();
    const settings = { ...DEFAULT_SETTINGS };
    for (const p of settings.providers) {
      p.apiKey = '';
    }
    set({ settings });
  },
}));
