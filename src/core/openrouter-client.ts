/**
 * OpenRouter API client — OpenAI-compatible chat completions
 */

export interface OpenRouterSettings {
  apiKey: string;
  model: string;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  top_provider: { max_completion_tokens: number | null };
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Fetch available models from OpenRouter
 */
export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch models: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  return (data.data || []) as OpenRouterModel[];
}

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatCompletion(
  settings: OpenRouterSettings,
  messages: OpenRouterMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<ChatResponse> {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://claude-explorer.local',
      'X-Title': 'Claude Explorer',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error('No response from model');
  }

  return {
    content: choice.message?.content || '',
    model: data.model || settings.model,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
  };
}
