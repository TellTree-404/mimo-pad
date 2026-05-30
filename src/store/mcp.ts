import { create } from 'zustand';
import type { McpServerConfig } from '../types';
import { mcpManager } from '../services/mcp';

interface McpState {
  servers: McpServerConfig[];
  connectedIds: string[];
  connect: (server: McpServerConfig) => Promise<void>;
  disconnect: (id: string) => void;
  toggle: (id: string) => Promise<void>;
  setServers: (servers: McpServerConfig[]) => void;
  getConnectedTools: () => unknown[];
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  connectedIds: [],

  async connect(server) {
    await mcpManager.connect(server);
    set((s) => ({
      connectedIds: [...new Set([...s.connectedIds, server.id])],
      servers: s.servers.map((srv) =>
        srv.id === server.id ? { ...srv, enabled: true } : srv
      ),
    }));
  },

  disconnect(id) {
    mcpManager.disconnect(id);
    set((s) => ({
      connectedIds: s.connectedIds.filter((i) => i !== id),
      servers: s.servers.map((srv) =>
        srv.id === id ? { ...srv, enabled: false } : srv
      ),
    }));
  },

  async toggle(id) {
    const { connectedIds, servers } = get();
    if (connectedIds.includes(id)) {
      get().disconnect(id);
    } else {
      const server = servers.find((s) => s.id === id);
      if (server) {
        await get().connect(server);
      }
    }
  },

  setServers(servers) {
    set({ servers });
  },

  getConnectedTools() {
    const { connectedIds } = get();
    if (connectedIds.length === 0) return [];
    return mcpManager.getAllTools(connectedIds);
  },
}));
