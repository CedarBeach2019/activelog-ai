import type { Env, ProviderMessage, ProviderResponse } from '../types.js';

// ─── Options ───────────────────────────────────────────────────────────────

export interface ProviderOptions {
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  timeoutMs?: number;
}

// ─── Error types ───────────────────────────────────────────────────────────

export class ProviderError extends Error {
  constructor(
    public readonly type: 'timeout' | 'rate_limit' | 'auth_failed' | 'invalid_response' | 'unknown',
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// ─── Build request body ────────────────────────────────────────────────────

function buildBody(
  messages: ProviderMessage[],
  systemPrompt: string | undefined,
  options: Partial<ProviderOptions> & { stream?: boolean },
): Record<string, unknown> {
  const allMessages: ProviderMessage[] = [];
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt });
  }
  allMessages.push(...messages);

  const body: Record<string, unknown> = {
    model: options.model ?? 'deepseek-chat',
    messages: allMessages,
  };

  if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.topP !== undefined) body.top_p = options.topP;
  if (options.stop) body.stop = options.stop;
  if (options.stream !== undefined) body.stream = options.stream;

  return body;
}

// ─── Chat (non-streaming) ──────────────────────────────────────────────────

/**
 * Call an OpenAI-compatible provider API and return the response.
 */
export async function chat(
  messages: ProviderMessage[],
  systemPrompt: string | undefined,
  env: Env,
  options: ProviderOptions,
): Promise<ProviderResponse> {
  const start = Date.now();
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
  const timeout = options.timeoutMs ?? 30_000;

  const body = buildBody(messages, systemPrompt, options);

  let response: Response;
  try {
    response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ProviderError('timeout', `Provider did not respond within ${timeout}ms`)), timeout),
      ),
    ]);
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError('unknown', `Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Handle HTTP errors
  if (response.status === 401 || response.status === 403) {
    throw new ProviderError('auth_failed', 'Provider authentication failed', response.status);
  }
  if (response.status === 429) {
    throw new ProviderError('rate_limit', 'Provider rate limit exceeded', response.status);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ProviderError('unknown', `Provider error ${response.status}: ${text}`, response.status);
  }

  // Parse response
  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ProviderError('invalid_response', 'Failed to parse provider response as JSON');
  }

  // Extract content
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (!choices || choices.length === 0) {
    throw new ProviderError('invalid_response', 'Provider returned no choices');
  }

  const firstChoice = choices[0];
  const message = firstChoice.message as Record<string, unknown> | undefined;
  if (!message || typeof message.content !== 'string') {
    throw new ProviderError('invalid_response', 'Provider returned invalid message content');
  }

  // Extract usage
  const usage = data.usage as Record<string, number> | undefined;

  return {
    content: message.content,
    model: (data.model as string) ?? options.model,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
        }
      : undefined,
    latencyMs: Date.now() - start,
  };
}

// ─── Chat Stream ───────────────────────────────────────────────────────────

/**
 * Call an OpenAI-compatible provider API with streaming.
 * Yields chunks as they arrive.
 */
export async function* chatStream(
  messages: ProviderMessage[],
  systemPrompt: string | undefined,
  env: Env,
  options: ProviderOptions,
): AsyncGenerator<{
  content: string;
  done: boolean;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
  latencyMs: number;
}> {
  const start = Date.now();
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
  const timeout = options.timeoutMs ?? 60_000;

  const body = buildBody(messages, systemPrompt, { ...options, stream: true });

  let response: Response;
  try {
    response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ProviderError('timeout', `Provider did not respond within ${timeout}ms`)), timeout),
      ),
    ]);
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError('unknown', `Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new ProviderError('auth_failed', 'Provider authentication failed', response.status);
  }
  if (response.status === 429) {
    throw new ProviderError('rate_limit', 'Provider rate limit exceeded', response.status);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ProviderError('unknown', `Provider error ${response.status}: ${text}`, response.status);
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ProviderError('invalid_response', 'Provider returned no streaming body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed === 'data: [DONE]') {
        return;
      }

      if (trimmed.startsWith('data: ')) {
        try {
          const chunk = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
          const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
          if (!choices || choices.length === 0) continue;

          const delta = choices[0].delta as Record<string, unknown> | undefined;
          const finishReason = choices[0].finish_reason as string | undefined;
          const content = (delta?.content as string) ?? '';
          const model = chunk.model as string | undefined;

          const usage = chunk.usage as Record<string, number> | undefined;

          yield {
            content,
            done: finishReason === 'stop',
            model,
            usage: usage
              ? {
                  promptTokens: usage.prompt_tokens ?? 0,
                  completionTokens: usage.completion_tokens ?? 0,
                }
              : undefined,
            latencyMs: Date.now() - start,
          };
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}
