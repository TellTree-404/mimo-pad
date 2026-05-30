import type { Conversation, AppSettings, MemoryEntry, ProviderConfig } from '../types';

const DB_NAME = 'mimo-pad-db';
const DB_VERSION = 1;

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
    try {
      return await dbOp('conversations', 'readonly', (s) => s.getAll());
    } catch {
      return [];
    }
  },

  async getConversation(id: string): Promise<Conversation | undefined> {
    try {
      return await dbOp('conversations', 'readonly', (s) => s.get(id));
    } catch {
      return undefined;
    }
  },

  async saveConversation(conv: Conversation): Promise<void> {
    await dbOp('conversations', 'readwrite', (s) => s.put(conv));
  },

  async deleteConversation(id: string): Promise<void> {
    await dbOp('conversations', 'readwrite', (s) => s.delete(id));
  },

  async getAllMemoryEntries(): Promise<MemoryEntry[]> {
    try {
      return await dbOp('memory', 'readonly', (s) => s.getAll());
    } catch {
      return [];
    }
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

  getSettings(): AppSettings | null {
    try {
      const raw = localStorage.getItem('mimo-pad-settings');
      if (!raw) return null;
      return JSON.parse(raw) as AppSettings;
    } catch {
      return null;
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem('mimo-pad-settings', JSON.stringify(settings));
  },

  getApiKey(providerId: string): string {
    try {
      return localStorage.getItem(`mimo-pad-apikey-${providerId}`) ?? '';
    } catch {
      return '';
    }
  },

  saveApiKey(providerId: string, key: string): void {
    localStorage.setItem(`mimo-pad-apikey-${providerId}`, key);
  },

  clearAll(): void {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith('mimo-pad-')
    );
    for (const k of keys) localStorage.removeItem(k);
    indexedDB.deleteDatabase(DB_NAME);
  },
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: false },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: false },
      { id: 'o4-mini', name: 'o4-mini', maxTokens: 200000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: true },
    ],
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', maxTokens: 200000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: false },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', maxTokens: 200000, supportsStreaming: true, supportsTools: true, supportsVision: true, supportsReasoning: false },
    ],
    authHeader: 'x-api-key',
    authPrefix: '',
  },
  {
    id: 'deepseek',
    name: 'Deepseek',
    type: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: [
      { id: 'deepseek-chat', name: 'Deepseek V3', maxTokens: 65536, supportsStreaming: true, supportsTools: true, supportsVision: false, supportsReasoning: false },
      { id: 'deepseek-reasoner', name: 'Deepseek R1', maxTokens: 65536, supportsStreaming: true, supportsTools: false, supportsVision: false, supportsReasoning: true },
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
  fontSize: 16,
  language: 'zh',
  voiceInputMode: 'toggle',
  autoSendVoice: false,
  providers: DEFAULT_PROVIDERS,
  activeProviderId: 'openai',
  activeModelId: 'gpt-4o',
  mcpServers: [],
  memoryEnabled: true,
  maxMemoryEntries: 50,
  maxContextTokens: 32000,
  defaultSystemPrompt: '',
};
