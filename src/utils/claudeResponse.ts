// Shared parsing for Anthropic Messages API responses.
//
// Models with adaptive thinking on by default (Opus 5, Sonnet 5) return
// `thinking` blocks before the `text` block, so the answer is never simply
// content[0]. They also count thinking tokens against max_tokens, which means
// a tight max_tokens can return a thinking block and no text at all.

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
  stop_reason?: string;
}

export function extractClaudeText(data: ClaudeResponse): string {
  if (data.stop_reason === 'refusal') {
    throw new Error('Claude declined to answer this request. Try rephrasing it.');
  }

  const text = data.content?.find((b) => b.type === 'text')?.text;
  if (text) return text;

  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      'Response was cut off before Claude finished thinking. Try a shorter question, or switch to a faster model in Settings.',
    );
  }

  throw new Error('Claude returned an empty response. Please try again.');
}
