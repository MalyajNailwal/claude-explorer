/**
 * OpenRouter API client - Access 200+ AI models through unified API
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
  };
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private models: Map<string, OpenRouterModel> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch available models from OpenRouter
   */
  async fetchModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json() as { data: OpenRouterModel[] };
      const models = data.data || [];

      // Cache models
      models.forEach((model: OpenRouterModel) => {
        this.models.set(model.id, model);
      });

      return models;
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      throw error;
    }
  }

  /**
   * Get cached models or fetch if empty
   */
  async getModels(): Promise<OpenRouterModel[]> {
    if (this.models.size === 0) {
      await this.fetchModels();
    }
    return Array.from(this.models.values());
  }

  /**
   * Get specific model info
   */
  async getModel(modelId: string): Promise<OpenRouterModel | undefined> {
    if (!this.models.has(modelId)) {
      await this.fetchModels();
    }
    return this.models.get(modelId);
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(
    messages: OpenRouterMessage[],
    model: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<OpenRouterResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Claude Explorer',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          stream: options.stream ?? false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      return await response.json() as OpenRouterResponse;
    } catch (error) {
      console.error('OpenRouter chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Stream chat completion
   */
  async *chatCompletionStream(
    messages: OpenRouterMessage[],
    model: string,
    options: {
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Claude Explorer',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming failed:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated cost for a request
   */
  async estimateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): Promise<{ prompt: number; completion: number; total: number } | null> {
    const modelInfo = await this.getModel(model);
    if (!modelInfo) return null;

    const promptCost = (parseFloat(modelInfo.pricing.prompt) * promptTokens) / 1000000;
    const completionCost = (parseFloat(modelInfo.pricing.completion) * completionTokens) / 1000000;

    return {
      prompt: promptCost,
      completion: completionCost,
      total: promptCost + completionCost,
    };
  }

  /**
   * Validate API key by making a test request
   */
  async validateKey(): Promise<boolean> {
    try {
      await this.fetchModels();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get popular/recommended models - prioritize free models
   */
  async getPopularModels(): Promise<OpenRouterModel[]> {
    const models = await this.getModels();
    
    // Filter for free models first (pricing is "0" or very low)
    const freeModels = models.filter(m => {
      const promptPrice = parseFloat(m.pricing?.prompt || '0');
      return promptPrice === 0;
    });
    
    // If we have free models, return them
    if (freeModels.length > 0) {
      return freeModels.slice(0, 20); // Limit to 20 free models
    }
    
    // Otherwise, fall back to popular models
    const popularIds = [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-1.5-pro',
      'google/gemini-1.5-flash',
      'meta-llama/llama-3.1-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
    ];

    return models.filter(m => popularIds.includes(m.id));
  }
}
