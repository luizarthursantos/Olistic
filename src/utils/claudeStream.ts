// Streaming client for the Anthropic Messages API.
//
// Chat has to stream rather than wait for a complete JSON body. Opus 5 and
// Sonnet 5 think before they write, so a non-streaming request sends zero
// bytes for as long as the model is thinking. On mobile networks that silent
// gap gets the connection dropped by the carrier or the browser, and the
// pending fetch() never settles — the UI sits on the typing indicator
// forever. A streamed response keeps bytes flowing (Anthropic emits `ping`
// events during long thinking blocks), so the connection stays alive and we
// can show text the moment the model starts writing.
//
// Anthropic also rejects non-streaming requests whose max_tokens is large
// enough that they might exceed the 10-minute request ceiling, which our
// 16k-token chat budget is well within range of.

import { ClaudeModel } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Anthropic pings during long thinking blocks, so a gap this long means the
// connection is gone rather than the model still working.
const STALL_TIMEOUT_MS = 120_000;

export interface ClaudeStreamRequest {
  apiKey: string;
  model: ClaudeModel;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens: number;
  /** Called with each chunk of answer text as it arrives. */
  onText?: (chunk: string) => void;
  signal?: AbortSignal;
  /** Overrides how long a silent connection is tolerated. Defaults to two minutes. */
  stallTimeoutMs?: number;
}

interface StreamEvent {
  type: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  error?: { type?: string; message?: string };
  message?: { stop_reason?: string };
}

/**
 * Sends a streamed Messages API request and resolves with the full answer
 * text. Thinking deltas are consumed but not returned — only `text_delta`
 * content reaches the caller.
 */
export async function streamClaudeText(req: ClaudeStreamRequest): Promise<string> {
  const controller = new AbortController();
  const abortOuter = () => controller.abort();
  req.signal?.addEventListener('abort', abortOuter);

  // Fires only if the connection goes completely silent — reset on every
  // chunk, including pings.
  let stalled = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const pokeWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, req.stallTimeoutMs ?? STALL_TIMEOUT_MS);
  };

  try {
    pokeWatchdog();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxTokens,
        stream: true,
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Claude API error (${response.status}): ${extractApiErrorMessage(body)}`);
    }
    if (!response.body) {
      throw new Error('Your browser does not support streaming responses.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let stopReason = '';
    let streamError = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pokeWatchdog();

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Keep the trailing partial
      // frame in the buffer until its terminator arrives.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const payload = parseFrame(frame);
        if (!payload) continue;

        switch (payload.type) {
          case 'content_block_delta':
            if (payload.delta?.type === 'text_delta' && payload.delta.text) {
              text += payload.delta.text;
              req.onText?.(payload.delta.text);
            }
            break;
          case 'message_delta':
            if (payload.delta?.stop_reason) stopReason = payload.delta.stop_reason;
            break;
          case 'error':
            streamError = payload.error?.message || 'The stream ended with an error.';
            break;
        }
      }
    }

    if (streamError) throw new Error(`Claude API error: ${streamError}`);
    if (text.trim()) return text;

    if (stopReason === 'refusal') {
      throw new Error('Claude declined to answer this request. Try rephrasing it.');
    }
    if (stopReason === 'max_tokens') {
      throw new Error(
        'Response was cut off before Claude finished thinking. Try a shorter question, or switch to a faster model in Settings.',
      );
    }
    throw new Error('Claude returned an empty response. Please try again.');
  } catch (err) {
    if (stalled) {
      throw new Error(
        'The connection to Claude stalled. Check your network and try again, or switch to a faster model in Settings.',
      );
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request cancelled.');
    }
    if (err instanceof TypeError) {
      // fetch() rejects with a TypeError when the network drops or CORS fails.
      throw new Error('Could not reach Claude. Check your network connection and try again.');
    }
    throw err;
  } finally {
    if (watchdog) clearTimeout(watchdog);
    req.signal?.removeEventListener('abort', abortOuter);
  }
}

/** Pulls the JSON payload out of one `event:`/`data:` SSE frame. */
function parseFrame(frame: string): StreamEvent | null {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');
  if (!data) return null;
  try {
    return JSON.parse(data) as StreamEvent;
  } catch {
    return null;
  }
}

/** Anthropic errors arrive as `{"error": {"message": "..."}}`. */
function extractApiErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || body;
  } catch {
    return body;
  }
}
