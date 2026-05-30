import type { MemoryEntry, ChatMessage, Conversation } from '../types';
import { storage } from './storage';
import { nanoid } from 'nanoid';

const MAX_MEMORY_ENTRIES = 50;
const MAX_INJECTED_TOKENS = 3000;

export async function addMemory(
  content: string,
  scope: 'global' | 'project' | 'conversation' = 'conversation',
  importance: number = 1,
  conversationId?: string,
  projectId?: string,
  tags?: string[]
): Promise<void> {
  const entry: MemoryEntry = {
    id: nanoid(),
    content,
    timestamp: Date.now(),
    importance,
    conversationId,
    projectId,
    scope,
    tags,
  };
  await storage.saveMemoryEntry(entry);

  const allEntries = await storage.getAllMemoryEntries();
  if (allEntries.length > MAX_MEMORY_ENTRIES) {
    allEntries.sort((a, b) => a.importance - b.importance || a.timestamp - b.timestamp);
    const toDelete = allEntries.slice(0, allEntries.length - MAX_MEMORY_ENTRIES);
    for (const e of toDelete) await storage.deleteMemoryEntry(e.id);
  }
}

export async function searchMemory(query: string): Promise<MemoryEntry[]> {
  const entries = await storage.getAllMemoryEntries();
  const lower = query.toLowerCase();
  return entries
    .filter((e) => e.content.toLowerCase().includes(lower))
    .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
    .slice(0, 5);
}

export async function buildMemoryContext(
  conversationId?: string,
  projectId?: string,
  memoryShared: boolean = true
): Promise<string> {
  const entries = await storage.getAllMemoryEntries();

  const relevant = entries.filter((e) => {
    if (!memoryShared && e.conversationId !== conversationId) return false;
    if (e.scope === 'global') return e.conversationId !== conversationId;
    if (e.scope === 'project' && projectId) return e.projectId === projectId && e.conversationId !== conversationId;
    if (e.scope === 'conversation') return e.conversationId === conversationId;
    return false;
  });

  const sorted = relevant
    .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
    .slice(0, 10);

  if (sorted.length === 0) return '';

  const items: string[] = [];
  let tokenEstimate = 0;

  for (const e of sorted) {
    const line = `- [${e.scope === 'global' ? '全局' : e.scope === 'project' ? '项目' : '对话'}] ${e.content}`;
    const tokenCost = estimateSimpleTokens(line);
    if (tokenEstimate + tokenCost > MAX_INJECTED_TOKENS) break;
    items.push(line);
    tokenEstimate += tokenCost;
  }

  if (items.length === 0) return '';

  const scopeLabel = memoryShared ? '共享记忆' : '本对话记忆';
  return `\n\n## ${scopeLabel}\n以下是从相关对话中提取的重要信息：\n${items.join('\n')}\n`;
}

export async function extractKeyInsights(
  messages: ChatMessage[],
  conversationId: string,
  projectId?: string,
  memoryShared: boolean = true
): Promise<void> {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return;

  const lastUserMsg = userMessages[userMessages.length - 1];
  const keyTopics = detectKeyTopics(lastUserMsg.content);

  const scope = memoryShared ? (projectId ? 'project' : 'global') : 'conversation';

  for (const topic of keyTopics) {
    if (topic.length > 5) {
      await addMemory(topic, scope, 1, conversationId, projectId, ['auto-extracted']);
    }
  }
}

function detectKeyTopics(text: string): string[] {
  const topics: string[] = [];
  const langPattern = /(使用|采用|基于|开发|编写|实现|配置|创建|修复|优化|部署|测试|项目|代码|API|数据库|服务器|前端|后端|Python|JavaScript|TypeScript|React|Vue|Node\.js|Docker|Kubernetes|AI|LLM|MCP|API key|平板|Android|iOS|小米|iPad)/g;
  const matches = text.match(langPattern);
  if (matches) topics.push(...matches);

  const linePattern = /(?:关于|Regarding|About)\s*(.{5,50})/g;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    topics.push(match[1].trim());
  }

  return [...new Set(topics)];
}

export function manageContextWindow(
  messages: ChatMessage[],
  maxTokens: number,
): ChatMessage[] {
  let totalTokens = 0;
  const result: ChatMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = msg.tokenCount ?? estimateSimpleTokens(msg.content);

    if (totalTokens + msgTokens > maxTokens) break;
    totalTokens += msgTokens;
    result.unshift(msg);
  }

  return result;
}

export function estimateSimpleTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code <= 0x7f) count += 1;
    else if (code <= 0x7ff) count += 2;
    else if (code <= 0xffff) count += 3;
    else count += 4;
  }
  return Math.ceil(count / 2.5);
}
