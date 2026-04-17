interface AnthropicLike {
  messages: {
    countTokens(args: { model: string; messages: Array<{ role: 'user'; content: string }> }): Promise<{ input_tokens: number }>;
  };
}

interface SdkModule {
  default: new (opts?: { apiKey?: string }) => AnthropicLike;
}

let cachedClient: AnthropicLike | null = null;

async function loadSdk(): Promise<SdkModule> {
  try {
    return (await import('@anthropic-ai/sdk')) as unknown as SdkModule;
  } catch {
    throw new Error(
      'exact token counting requires the optional peer `@anthropic-ai/sdk`. ' +
        'install it (`npm i @anthropic-ai/sdk`) or unset ANTHROPIC_API_KEY to use offline estimates.',
    );
  }
}

async function getClient(): Promise<AnthropicLike> {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('exact token counting requires ANTHROPIC_API_KEY to be set.');
  }
  const sdk = await loadSdk();
  const Client = sdk.default;
  cachedClient = new Client({ apiKey });
  return cachedClient;
}

export const DEFAULT_EXACT_MODEL = 'claude-sonnet-4-6';

export async function exactCount(text: string, model: string = DEFAULT_EXACT_MODEL): Promise<number> {
  const client = await getClient();
  try {
    const result = await client.messages.countTokens({
      model,
      messages: [{ role: 'user', content: text }],
    });
    return result.input_tokens;
  } catch (err) {
    const e = err as Error & { status?: number; error?: { message?: string } };
    const detail = e.error?.message ?? e.message;
    throw new Error(`exact token count failed (${model})${e.status ? ` [HTTP ${e.status}]` : ''}: ${detail}`);
  }
}

export function resetExactClientForTests(): void {
  cachedClient = null;
}
