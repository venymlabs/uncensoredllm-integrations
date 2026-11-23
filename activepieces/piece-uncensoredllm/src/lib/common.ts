export const BASE_URL = 'https://uncensoredllm.xyz/v1';
export const MODEL_ID = 'uncensoredllm-1';
// The model reasons before it answers. A budget under about 400 tokens can be spent on the
// reasoning alone (the API answers 502 empty_completion), so a smaller value is raised to this.
export const MIN_MAX_TOKENS = 512;

// Plain fetch on purpose: the httpClient in @activepieces/pieces-common 0.12.5 sets
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' on every request, which would send the key
// without checking the server's certificate.
export async function callApi<T = Record<string, unknown>>(
  apiKey: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(600000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: string } } | null)?.error;
    throw new Error(`UncensoredLLM ${res.status}: ${err?.message ?? err?.code ?? text.slice(0, 200)}`);
  }
  return json as T;
}
