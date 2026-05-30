export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type ThinkingLevel = 'auto' | 'off' | 'low' | 'medium' | 'high' | 'max';
export type AgentMode = 'plan' | 'agent' | 'yolo';

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
  tokenCount?: number;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  providerId: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
  memorySummary?: string;
  memoryEntries?: string[];
  projectId?: string;
  memoryShared: boolean;
}

export type MemoryScope = 'global' | 'project' | 'conversation';

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
  conversationId?: string;
  projectId?: string;
  scope: MemoryScope;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  createdAt: number;
  memoryShared: boolean;
}

export type ProviderType = 'openai' | 'anthropic' | 'mimo' | 'deepseek' | 'custom';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  models: ModelConfig[];
  authHeader: string;
  authPrefix: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export type McpServerType = 'stdio' | 'sse' | 'builtin';

export interface McpServerConfig {
  id: string;
  name: string;
  type: McpServerType;
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
  autoApprove: boolean;
  env?: Record<string, string>;
}

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
  conversationId?: string;
  tags?: string[];
}

export interface AppSettings {
  theme: 'dark' | 'parchment';
  thinkingLevel: ThinkingLevel;
  agentMode: AgentMode;
  backgroundImage?: string;
  fontSize: number;
  language: 'zh' | 'en';
  voiceInputMode: 'hold' | 'toggle';
  autoSendVoice: boolean;
  providers: ProviderConfig[];
  activeProviderId: string;
  activeModelId: string;
  mcpServers: McpServerConfig[];
  memoryEnabled: boolean;
  maxMemoryEntries: number;
  maxContextTokens: number;
  defaultSystemPrompt: string;
  githubToken?: string;
}

export interface ExportedSkill {
  id: string;
  name: string;
  description: string;
  content: string;
  source?: string;
  installedAt: number;
  enabled: boolean;
}

export interface LLMChatParams {
  provider: ProviderConfig;
  model: string;
  messages: { role: string; content: string; reasoning_content?: string; tool_calls?: unknown[]; tool_call_id?: string }[];
  systemPrompt?: string;
  tools?: unknown[];
  toolChoice?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  reasoningEffort?: string;
  signal?: AbortSignal;
}

export interface StreamChunk {
  content?: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type McpResource = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface GoalPhase {
  id: string;
  title: string;
  status: 'pending' | 'doing' | 'done';
  tasks: string[];
  conversationId?: string;
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'done';
  phases: GoalPhase[];
  projectId?: string;
  autoProgress: boolean;
  maxRetries: number;
  currentRetries: number;
  createdAt: number;
  updatedAt: number;
}
