import type { Conversation, AppSettings, MemoryEntry, ProviderConfig, ExportedSkill } from '../types';

const DB_NAME = 'mimo-pad-db';
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('memory')) {
        db.createObjectStore('memory', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('skills')) {
        db.createObjectStore('skills', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbOp<T>(
  storeName: string,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = op(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  async getAllConversations(): Promise<Conversation[]> {
    try { return await dbOp('conversations', 'readonly', (s) => s.getAll()); }
    catch { return []; }
  },
  async getConversation(id: string): Promise<Conversation | undefined> {
    try { return await dbOp('conversations', 'readonly', (s) => s.get(id)); }
    catch { return undefined; }
  },
  async saveConversation(conv: Conversation): Promise<void> {
    await dbOp('conversations', 'readwrite', (s) => s.put(conv));
  },
  async deleteConversation(id: string): Promise<void> {
    await dbOp('conversations', 'readwrite', (s) => s.delete(id));
  },

  async getAllMemoryEntries(): Promise<MemoryEntry[]> {
    try { return await dbOp('memory', 'readonly', (s) => s.getAll()); }
    catch { return []; }
  },
  async saveMemoryEntry(entry: MemoryEntry): Promise<void> {
    await dbOp('memory', 'readwrite', (s) => s.put(entry));
  },
  async deleteMemoryEntry(id: string): Promise<void> {
    await dbOp('memory', 'readwrite', (s) => s.delete(id));
  },
  async clearMemory(): Promise<void> {
    await dbOp('memory', 'readwrite', (s) => s.clear());
  },

  async getAllSkills(): Promise<ExportedSkill[]> {
    try { return await dbOp('skills', 'readonly', (s) => s.getAll()); }
    catch { return []; }
  },
  async saveSkill(skill: ExportedSkill): Promise<void> {
    await dbOp('skills', 'readwrite', (s) => s.put(skill));
  },
  async deleteSkill(id: string): Promise<void> {
    await dbOp('skills', 'readwrite', (s) => s.delete(id));
  },

  async getAllProjects(): Promise<Project[]> {
    try { return await dbOp('projects', 'readonly', (s) => s.getAll()); }
    catch { return []; }
  },
  async saveProject(project: Project): Promise<void> {
    await dbOp('projects', 'readwrite', (s) => s.put(project));
  },
  async deleteProject(id: string): Promise<void> {
    await dbOp('projects', 'readwrite', (s) => s.delete(id));
  },

  getSettings(): AppSettings | null {
    try {
      const raw = localStorage.getItem('mimo-pad-settings');
      return raw ? JSON.parse(raw) as AppSettings : null;
    } catch { return null; }
  },
  saveSettings(settings: AppSettings): void {
    localStorage.setItem('mimo-pad-settings', JSON.stringify(settings));
  },
  getApiKey(providerId: string): string {
    try { return localStorage.getItem(`mimo-pad-apikey-${providerId}`) ?? ''; }
    catch { return ''; }
  },
  saveApiKey(providerId: string, key: string): void {
    localStorage.setItem(`mimo-pad-apikey-${providerId}`, key);
  },
  clearAll(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('mimo-pad-'));
    for (const k of keys) localStorage.removeItem(k);
    indexedDB.deleteDatabase(DB_NAME);
  },
};

import type { Project } from '../types';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'Deepseek',
    type: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: [
      { id: 'deepseek-v4-pro', name: 'Deepseek V4 Pro', maxTokens: 1048576, supportsStreaming: true, supportsTools: true, supportsVision: false, supportsReasoning: false },
      { id: 'deepseek-v4-flash', name: 'Deepseek V4 Flash', maxTokens: 1048576, supportsStreaming: true, supportsTools: true, supportsVision: false, supportsReasoning: false },
    ],
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    id: 'mimo',
    name: 'Xiaomi MiMo',
    type: 'mimo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    apiKey: '',
    models: [
      { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro', maxTokens: 128000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: true },
      { id: 'mimo-v2.5-flash', name: 'MiMo V2.5 Flash', maxTokens: 128000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: false },
    ],
    authHeader: 'api-key',
    authPrefix: '',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  thinkingLevel: 'auto',
  agentMode: 'agent',
  fontSize: 16,
  language: 'zh',
  voiceInputMode: 'toggle',
  autoSendVoice: false,
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'deepseek',
  activeModelId: 'deepseek-v4-pro',
  mcpServers: [],
  memoryEnabled: true,
  maxMemoryEntries: 50,
  maxContextTokens: 64000,
  defaultSystemPrompt: '',
};
