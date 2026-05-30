import type { McpServerConfig, McpTool, ToolResult } from '../types';
import { nanoid } from 'nanoid';
import { getDeviceInfo, formatDeviceInfo } from '../hooks/useDeviceInfo';
import { findApp, buildIntentUri, APP_REGISTRY } from './apps';

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
  device_info: {
    description: 'Query current device hardware info (CPU/GPU/RAM/storage/network). Use this before recommending tools or optimizing code for this device.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  app_control: {
    description: `Launch or interact with installed Android apps. Known apps: ${APP_REGISTRY.map(a => a.name).join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'App name or ID' },
        action: { type: 'string', enum: ['launch', 'search', 'open_url'], description: 'launch/open URL/path' },
        query: { type: 'string', description: 'Search keyword or URL' },
      },
      required: ['app', 'action'],
    },
  },
  github_get_file: {
    description: 'Fetch a file from a public GitHub repository. Returns file content.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub username or organization' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path within the repo (e.g. README.md)' },
        branch: { type: 'string', description: 'Branch name (default: main)' },
      },
      required: ['owner', 'repo', 'path'],
    },
  },
  github_search_skills: {
    description: 'Search GitHub for skill files (.md) by topic or keyword. Great for finding AI agent skills.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "react component skill" or "opencode skills")' },
        maxResults: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  github_list_dir: {
    description: 'List files in a directory of a GitHub repository.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub username or organization' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'Directory path (default: root)' },
        branch: { type: 'string', description: 'Branch name (default: main)' },
      },
      required: ['owner', 'repo'],
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
  private workDirPath: string = '';

  setWorkDir(path: string) {
    this.workDirPath = path;
  }

  getWorkDir() {
    return this.workDirPath;
  }

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

      case 'github_get_file': {
        const { owner, repo, path: ghPath, branch = 'main' } = args as Record<string, string>;
        try {
          const resp = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${ghPath}`
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const content = await resp.text();
          return { toolCallId, content };
        } catch (e) {
          throw new Error(`GitHub fetch failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      case 'github_list_dir': {
        const { owner, repo, path: ghDirPath = '', branch: ghBranch = 'main' } = args as Record<string, string>;
        try {
          const apiPath = ghDirPath ? `contents/${ghDirPath}` : 'contents';
          const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/${apiPath}?ref=${ghBranch}`
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const items = await resp.json() as { name: string; type: string; path: string; size: number }[];
          const listing = Array.isArray(items) ? items.map((i) =>
            `${i.type === 'dir' ? '📁' : '📄'} ${i.path}${i.type === 'file' ? ` (${i.size} B)` : ''}`
          ).join('\n') : 'Not a directory';
          return { toolCallId, content: listing || 'Empty directory' };
        } catch (e) {
          throw new Error(`GitHub list failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      case 'github_search_skills': {
        const { query, maxResults = 10 } = args as Record<string, unknown>;
        try {
          const resp = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(String(query))}+topic:skills&sort=stars&per_page=${maxResults}`
          );
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json() as { items?: { full_name: string; description: string; html_url: string; stargazers_count: number }[] };
          const repos = data.items || [];
          const results = repos.map((r) =>
            `- **${r.full_name}** ⭐${r.stargazers_count}\n  ${r.description || 'No description'}\n  ${r.html_url}`
          );
          return {
            toolCallId,
            content: results.length > 0
              ? `Found ${results.length} repos:\n\n${results.join('\n\n')}`
              : `No repos found for "${query}"`,
          };
        } catch (e) {
          throw new Error(`GitHub search failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      case 'device_info': {
        try {
          const info = await getDeviceInfo();
          return { toolCallId, content: formatDeviceInfo(info) };
        } catch (e) {
          return { toolCallId, content: `设备信息获取失败: ${e}` };
        }
      }

      case 'app_control': {
        const appName = (args.app as string) || '';
        const action = (args.action as string) || 'launch';
        const query = args.query as string | undefined;
        const app = findApp(appName);

        if (!app) {
          return { toolCallId, content: `未找到应用 "${appName}"。已知应用: ${APP_REGISTRY.map(a => `${a.name}(${a.id})`).join(', ')}。请直接通过包名用 intent:// 协议尝试。` };
        }

        const uri = buildIntentUri(app, action, query);
        if (!uri) {
          return { toolCallId, content: `无法为 "${app.name}" 构建 ${action} intent。` };
        }

        try {
          if (action === 'open_url') {
            window.open(uri, '_blank');
          } else {
            const a = document.createElement('a');
            a.href = uri;
            a.click();
          }
          return { toolCallId, content: `已唤起 ${app.name}: ${action}${query ? ` (${query})` : ''}` };
        } catch (e) {
          return { toolCallId, content: `唤起失败: ${e}。请确认应用已安装。` };
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
