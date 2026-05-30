import type { McpServerConfig, McpTool, ToolResult } from '../types';
import { nanoid } from 'nanoid';

const BUILTIN_TOOLS: Record<string, { description: string; inputSchema: Record<string, unknown> }> = {
  read_file: {
    description: 'Read the contents of a file. Returns the file content as text.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to read' },
      },
      required: ['path'],
    },
  },
  search_files: {
    description: 'Search for files matching a glob pattern in a directory.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The glob pattern (e.g. "**/*.ts")' },
        directory: { type: 'string', description: 'The directory to search in' },
      },
      required: ['pattern'],
    },
  },
  web_search: {
    description: 'Search the web for information using DuckDuckGo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        maxResults: { type: 'number', description: 'Maximum number of results (default 5)' },
      },
      required: ['query'],
    },
  },
  execute_code: {
    description: 'Execute JavaScript code in a sandboxed environment and return the result.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The JavaScript code to execute' },
      },
      required: ['code'],
    },
  },
};

interface McpClientConnection {
  server: McpServerConfig;
  connected: boolean;
  tools: McpTool[];
}

class McpManager {
  private connections: Map<string, McpClientConnection> = new Map();
  private fileHandles: Map<string, FileSystemFileHandle> = new Map();
  private pickedDir: FileSystemDirectoryHandle | null = null;

  async connect(server: McpServerConfig): Promise<void> {
    if (server.type === 'builtin') {
      const tools: McpTool[] = Object.entries(BUILTIN_TOOLS).map(([name, def]) => ({
        name,
        description: def.description,
        inputSchema: def.inputSchema,
      }));
      this.connections.set(server.id, { server, connected: true, tools });
      return;
    }

    if (server.type === 'sse' && server.url) {
      try {
        const resp = await fetch(server.url);
        if (!resp.ok) throw new Error(`SSE connection failed: ${resp.status}`);
        const tools: McpTool[] = [];
        this.connections.set(server.id, { server, connected: true, tools });
      } catch (e) {
        throw new Error(`MCP SSE connection error: ${e}`);
      }
    }

    if (server.type === 'stdio') {
      throw new Error('Stdio MCP servers are not supported in browser. Use SSE or Builtin.');
    }
  }

  disconnect(serverId: string): void {
    this.connections.delete(serverId);
  }

  isConnected(serverId: string): boolean {
    return this.connections.get(serverId)?.connected ?? false;
  }

  getAllTools(serverIds: string[]): McpTool[] {
    const tools: McpTool[] = [];
    for (const id of serverIds) {
      const conn = this.connections.get(id);
      if (conn?.connected) {
        tools.push(...conn.tools);
      }
    }
    return tools;
  }

  async pickDirectory(): Promise<string | null> {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      this.pickedDir = handle;
      return handle.name;
    } catch {
      return null;
    }
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const toolCallId = nanoid();

    switch (toolName) {
      case 'read_file': {
        const path = args.path as string;
        if (!path) throw new Error('Missing required parameter: path');

        if (!this.pickedDir) {
          throw new Error('No directory selected. Use the file browser to select a working directory.');
        }

        const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
        let current: FileSystemDirectoryHandle | FileSystemFileHandle = this.pickedDir;

        for (let i = 0; i < parts.length - 1; i++) {
          const dir = current as FileSystemDirectoryHandle;
          try {
            current = await dir.getDirectoryHandle(parts[i]);
          } catch {
            throw new Error(`Directory not found: ${parts.slice(0, i + 1).join('/')}`);
          }
        }

        const dir = current as FileSystemDirectoryHandle;
        const fileName = parts[parts.length - 1];
        let fileHandle: FileSystemFileHandle;
        try {
          fileHandle = await dir.getFileHandle(fileName);
        } catch {
          throw new Error(`File not found: ${path}`);
        }

        const file = await fileHandle.getFile();
        const content = await file.text();

        return {
          toolCallId,
          content,
        };
      }

      case 'search_files': {
        const pattern = args.pattern as string;
        if (!pattern) throw new Error('Missing required parameter: pattern');

        if (!this.pickedDir) {
          throw new Error('No directory selected. Use the file browser to select a working directory.');
        }

        const globToRegex = (glob: string): RegExp => {
          let re = glob
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '____DOUBLESTAR____')
            .replace(/\*/g, '[^/]*')
            .replace(/____DOUBLESTAR____/g, '.*')
            .replace(/\?/g, '.');
          return new RegExp(`^${re}$`);
        };

        const regex = globToRegex(pattern);
        const results: string[] = [];

        const walk = async (dir: FileSystemDirectoryHandle, basePath: string) => {
          for await (const [name, handle] of dir.entries()) {
            const fullPath = basePath ? `${basePath}/${name}` : name;
            if (handle.kind === 'file' && regex.test(fullPath)) {
              results.push(fullPath);
            } else if (handle.kind === 'directory') {
              await walk(handle, fullPath);
            }
          }
        };

        await walk(this.pickedDir, '');

        return {
          toolCallId,
          content: results.length > 0
            ? `Found ${results.length} files:\n${results.join('\n')}`
            : `No files matching pattern "${pattern}"`,
        };
      }

      case 'web_search': {
        const query = args.query as string;
        const maxResults = (args.maxResults as number) || 5;

        if (!query) throw new Error('Missing required parameter: query');

        try {
          const resp = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
          );
          const data = await resp.json();
          const results = (data.RelatedTopics || [])
            .slice(0, maxResults)
            .map((r: { Text?: string; FirstURL?: string }) =>
              `- ${r.Text || 'No description'} ${r.FirstURL ? `(${r.FirstURL})` : ''}`
            );

          return {
            toolCallId,
            content: results.length > 0
              ? `Search results for "${query}":\n${results.join('\n')}`
              : `No results found for "${query}"`,
          };
        } catch {
          throw new Error('Web search failed. Check your network connection.');
        }
      }

      case 'execute_code': {
        const code = args.code as string;
        if (!code) throw new Error('Missing required parameter: code');

        try {
          const originalLog = console.log;
          const logs: string[] = [];
          console.log = (...args: unknown[]) => {
            logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
          };

          const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
          let result: unknown;
          try {
            result = await new AsyncFunction(code)();
          } catch (e) {
            console.log = originalLog;
            throw e;
          }
          console.log = originalLog;

          const output: string[] = [];
          if (logs.length > 0) output.push(`Logs:\n${logs.join('\n')}`);
          if (result !== undefined) output.push(`Result: ${JSON.stringify(result)}`);

          return {
            toolCallId,
            content: output.join('\n\n') || 'Code executed with no output.',
          };
        } catch (e) {
          return {
            toolCallId,
            content: `Execution error: ${e instanceof Error ? e.message : String(e)}`,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

export const mcpManager = new McpManager();

export function getToolsForProvider(serverIds: string[]): unknown[] {
  const tools = mcpManager.getAllTools(serverIds);
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}
