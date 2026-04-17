import { countTokens as legacyCount } from '@anthropic-ai/tokenizer';

export function offlineCount(text: string): number {
  // @anthropic-ai/tokenizer uses the Claude-2 BPE. Anthropic documents it as a
  // rough approximation for Claude 3+ models; good to within ~10% in practice.
  // That's why results from this path are labelled `mode: 'estimate'`.
  return legacyCount(text);
}
