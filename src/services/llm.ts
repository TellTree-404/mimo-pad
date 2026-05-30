import type { LLMChatParams, StreamChunk, ProviderConfig, ToolCall } from '../types';

export interface CacheInfo {
  hitTokens: number;
  missTokens: number;
}

let onCacheUpdate: ((info: CacheInfo) => void) | null = null;

export function setCacheUpdateHandler(handler: (info: CacheInfo) => void) {
  onCacheUpdate = handler;
}

function buildOpenAIRequest(params: LLMChatParams): { url: string; headers: Record<string, string>; body: string } {
  const { provider, model, messages, systemPrompt, tools, toolChoice, maxTokens, temperature, topP, stream } = params;
  const url = `${provider.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  headers[provider.authHeader] = provider.authPrefix + provider.apiKey;

  if (provider.type === 'anthropic' && url.includes('anthropic')) {
    headers['anthropic-version'] = '2023-06-01';
  }

  const bodyObj: Record<string, unknown> = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
    stream: stream ?? true,
  };

  if (maxTokens) bodyObj.max_completion_tokens = maxTokens;
  if (temperature !== undefined) bodyObj.temperature = temperature;
  if (topP !== undefined) bodyObj.top_p = topP;
  if (tools) bodyObj.tools = tools;
  if (toolChoice) bodyObj.tool_choice = toolChoice;
  if (params.reasoningEffort && params.reasoningEffort !== 'auto') bodyObj.reasoning_effort = params.reasoningEffort;

  return {
    url,
    headers,
    body: JSON.stringify(bodyObj),
  };
}

function buildAnthropicRequest(params: LLMChatParams): { url: string; headers: Record<string, string>; body: string } {
  const { provider, model, messages, systemPrompt, tools, maxTokens, temperature, topP, stream } = params;
  const url = `${provider.baseUrl}/v1/messages`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  headers[provider.authHeader] = provider.authPrefix + provider.apiKey;

  const systemList: unknown[] = systemPrompt
    ? [{ type: 'text', text: systemPrompt }]
    : [];

  const bodyObj: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens ?? 4096,
    stream: stream ?? true,
  };
  if (systemList.length > 0) bodyObj.system = systemList;
  if (temperature !== undefined) bodyObj.temperature = temperature;
  if (topP !== undefined) bodyObj.top_p = topP;
  if (tools) {
    bodyObj.tools = tools;
    bodyObj.tool_choice = { type: 'auto' };
  }

  return {
    url,
    headers,
    body: JSON.stringify(bodyObj),
  };
}

async function* parseOpenAIStream(response: Response): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  const toolCallAccum: Map<number, { id: string; name: string; args: string }> = new Map();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];

        const chunk: StreamChunk = {};

        if (choice?.delta?.content) {
          chunk.content = choice.delta.content;
        }
        if (choice?.delta?.reasoning_content) {
          chunk.reasoning = choice.delta.reasoning_content;
        }
        if (parsed.usage) {
          chunk.usage = {
            promptTokens: parsed.usage.prompt_tokens,
            completionTokens: parsed.usage.completion_tokens,
            totalTokens: parsed.usage.total_tokens,
          };
          if (parsed.usage.prompt_cache_hit_tokens !== undefined) {
            onCacheUpdate?.({
              hitTokens: parsed.usage.prompt_cache_hit_tokens,
              missTokens: parsed.usage.prompt_cache_miss_tokens ?? 0,
            });
          }
        }
        if (choice?.finish_reason) {
          chunk.finishReason = choice.finish_reason;
        }

        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallAccum.has(idx)) {
              toolCallAccum.set(idx, { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' });
            }
            const entry = toolCallAccum.get(idx)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name = tc.function.name;
            if (tc.function?.arguments) entry.args += tc.function.arguments;
          }
        }

        if (chunk.content || chunk.reasoning || chunk.usage || chunk.finishReason) {
          yield chunk;
        }
      } catch {
        continue;
      }
    }
  }

  if (toolCallAccum.size > 0) {
    const toolCalls: ToolCall[] = [];
    for (const [_, entry] of toolCallAccum) {
      toolCalls.push({
        id: entry.id,
        function: { name: entry.name, arguments: entry.args },
      });
    }
    yield { toolCalls };
  }
}

async function* parseAnthropicStream(response: Response): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  let currentToolIdx = -1;
  let currentToolName = '';
  let currentToolArgs = '';
  let currentToolId = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);

      try {
        const parsed = JSON.parse(data);
        const chunk: StreamChunk = {};

        switch (parsed.type) {
          case 'content_block_delta':
            if (parsed.delta?.type === 'text_delta') {
              chunk.content = parsed.delta.text;
            } else if (parsed.delta?.type === 'input_json_delta') {
              currentToolArgs += parsed.delta.partial_json;
            }
            break;
          case 'content_block_start':
            if (parsed.content_block?.type === 'tool_use') {
              currentToolIdx = parsed.index;
              currentToolName = parsed.content_block.name;
              currentToolId = parsed.content_block.id;
              currentToolArgs = '';
            }
            break;
          case 'content_block_stop':
            if (parsed.index === currentToolIdx && currentToolName) {
              yield {
                toolCalls: [{
                  id: currentToolId,
                  function: {
                    name: currentToolName,
                    arguments: currentToolArgs,
                  },
                }],
              };
              currentToolIdx = -1;
              currentToolName = '';
              currentToolId = '';
              currentToolArgs = '';
            }
            break;
          case 'message_delta':
            if (parsed.delta?.stop_reason) {
              chunk.finishReason = parsed.delta.stop_reason;
            }
            if (parsed.usage) {
              chunk.usage = {
                promptTokens: parsed.usage.input_tokens,
                completionTokens: parsed.usage.output_tokens,
                totalTokens: (parsed.usage.input_tokens + parsed.usage.output_tokens),
              };
            }
            break;
          case 'message_stop':
            break;
          case 'ping':
            continue;
        }

        if (chunk.content || chunk.finishReason || chunk.usage) {
          yield chunk;
        }
      } catch {
        continue;
      }
    }
  }
}

export async function* chatCompletion(params: LLMChatParams): AsyncGenerator<StreamChunk> {
  const { provider, model } = params;

  const isAnthropicFormat =
    provider.type === 'anthropic' ||
    (provider.type === 'mimo' && provider.baseUrl.includes('anthropic'));

  const { url, headers, body } = isAnthropicFormat
    ? buildAnthropicRequest(params)
    : buildOpenAIRequest(params);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: params.stream ? undefined : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = JSON.parse(errorText);
      errorMsg = errJson.error?.message || errJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  if (!params.stream) {
    const data = await response.json();
    if (isAnthropicFormat) {
      const text = data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
      yield { content: text };
      if (data.usage) {
        yield {
          usage: {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          },
        };
      }
    } else {
      const choice = data.choices?.[0];
      yield {
        content: choice?.message?.content ?? '',
        reasoning: choice?.message?.reasoning_content,
      };
      if (data.usage) {
        yield {
          usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
        };
      }
    }
    return;
  }

  const parser = isAnthropicFormat ? parseAnthropicStream : parseOpenAIStream;
  yield* parser(response);
}

export function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code <= 0x7f) {
      count += 1;
    } else if (code <= 0x7ff) {
      count += 2;
    } else if (code <= 0xffff) {
      count += 3;
    } else {
      count += 4;
    }
  }
  return Math.ceil(count / 2.5);
}

export function getActiveProvider(providers: ProviderConfig[], id: string): ProviderConfig | undefined {
  return providers.find((p) => p.id === id);
}
