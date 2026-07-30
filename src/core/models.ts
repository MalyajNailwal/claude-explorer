/**
 * Model selection and configuration - Multi-provider support
 */

export enum ModelProvider {
  ANTHROPIC = 'anthropic',
  OPENROUTER = 'openrouter',
}

export enum ModelType {
  // Anthropic models (dateless alias IDs)
  OPUS_5 = 'claude-opus-5',
  SONNET_5 = 'claude-sonnet-5',
  HAIKU_4_5 = 'claude-haiku-4-5',
  // OpenRouter models will be added dynamically
}

export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  maxTokens: number;
  description: string;
  costPerMillionInputTokens: number;
  costPerMillionOutputTokens: number;
  quality?: 'high' | 'medium' | 'low';
  speed?: 'fast' | 'moderate' | 'slow';
}

export const MODELS: Record<string, ModelConfig> = {
  [ModelType.OPUS_5]: {
    name: ModelType.OPUS_5,
    provider: ModelProvider.ANTHROPIC,
    maxTokens: 8192,
    description: 'Most capable model for complex reasoning and analysis',
    costPerMillionInputTokens: 5.0,
    costPerMillionOutputTokens: 25.0,
    quality: 'high',
    speed: 'moderate',
  },
  [ModelType.SONNET_5]: {
    name: ModelType.SONNET_5,
    provider: ModelProvider.ANTHROPIC,
    maxTokens: 8192,
    description: 'Best balance of speed and intelligence',
    costPerMillionInputTokens: 3.0,
    costPerMillionOutputTokens: 15.0,
    quality: 'high',
    speed: 'fast',
  },
  [ModelType.HAIKU_4_5]: {
    name: ModelType.HAIKU_4_5,
    provider: ModelProvider.ANTHROPIC,
    maxTokens: 8192,
    description: 'Fast and efficient for simple tasks',
    costPerMillionInputTokens: 1.0,
    costPerMillionOutputTokens: 5.0,
    quality: 'medium',
    speed: 'fast',
  },
};

export interface TaskComplexity {
  model: ModelType;
  reasoning: string;
}

/**
 * Model selector with multi-provider support
 */
export class ModelSelector {
  private openRouterModels: Map<string, ModelConfig> = new Map();

  /**
   * Add OpenRouter models dynamically
   */
  addOpenRouterModels(models: Array<{
    id: string;
    name: string;
    pricing: { prompt: string; completion: string };
    context_length: number;
  }>): void {
    models.forEach(model => {
      const config: ModelConfig = {
        name: model.id,
        provider: ModelProvider.OPENROUTER,
        maxTokens: model.context_length || 4096,
        description: model.name,
        costPerMillionInputTokens: parseFloat(model.pricing.prompt) || 0,
        costPerMillionOutputTokens: parseFloat(model.pricing.completion) || 0,
        quality: 'medium',
        speed: 'moderate',
      };
      this.openRouterModels.set(model.id, config);
      MODELS[model.id] = config;
    });
  }

  /**
   * Get all available models
   */
  getAllModels(): ModelConfig[] {
    return Object.values(MODELS);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ModelProvider): ModelConfig[] {
    return Object.values(MODELS).filter(m => m.provider === provider);
  }
  /**
   * Select appropriate model based on task complexity
   */
  selectModel(task: {
    type: 'search' | 'details' | 'export' | 'analyze' | 'chat';
    complexity?: 'simple' | 'moderate' | 'complex';
    requiresReasoning?: boolean;
    multiStep?: boolean;
  }): TaskComplexity {
    // Use Opus 5 for complex reasoning
    if (
      task.complexity === 'complex' ||
      task.requiresReasoning ||
      task.multiStep ||
      task.type === 'analyze' ||
      task.type === 'chat'
    ) {
      return {
        model: ModelType.OPUS_5,
        reasoning: 'Complex task requiring advanced reasoning and tool orchestration',
      };
    }

    // Use Haiku 4.5 for simple, fast operations
    if (
      task.type === 'search' ||
      task.type === 'details' ||
      (task.type === 'export' && !task.multiStep)
    ) {
      return {
        model: ModelType.HAIKU_4_5,
        reasoning: 'Simple task that can be handled efficiently by Haiku',
      };
    }

    // Default to Sonnet for chat and uncertain cases
    return {
      model: ModelType.SONNET_5,
      reasoning: 'Using Sonnet for optimal user experience',
    };
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const config = MODELS[model];
    if (!config) return 0;
    
    const inputCost =
      (inputTokens / 1_000_000) * config.costPerMillionInputTokens;
    const outputCost =
      (outputTokens / 1_000_000) * config.costPerMillionOutputTokens;
    return inputCost + outputCost;
  }

  /**
   * Get model info
   */
  getModelInfo(model: string): ModelConfig | undefined {
    return MODELS[model];
  }

  /**
   * Compare models - now includes all providers
   */
  compareModels(): {
    model: string;
    provider: ModelProvider;
    description: string;
    speed: string;
    cost: string;
    bestFor: string;
  }[] {
    const models = [];
    
    // Anthropic models
    models.push({
      model: 'Sonnet 4.5',
      provider: ModelProvider.ANTHROPIC,
      description: 'Most capable, best reasoning',
      speed: 'Moderate',
      cost: '$3-15 per million tokens',
      bestFor: 'Complex queries, multi-step tasks, analysis',
    });
    models.push({
      model: 'Haiku 4.5',
      provider: ModelProvider.ANTHROPIC,
      description: 'Fast and efficient',
      speed: 'Fast',
      cost: '$0.8-4 per million tokens',
      bestFor: 'Simple searches, quick exports, listings',
    });

    // OpenRouter models
    for (const [_id, config] of this.openRouterModels.entries()) {
      models.push({
        model: config.name,
        provider: ModelProvider.OPENROUTER,
        description: config.description,
        speed: config.speed || 'moderate',
        cost: `$${config.costPerMillionInputTokens}-${config.costPerMillionOutputTokens} per million tokens`,
        bestFor: 'Varies by model',
      });
    }

    return models;
  }
}

/**
 * Singleton instance
 */
let selectorInstance: ModelSelector | null = null;

export function getModelSelector(): ModelSelector {
  if (!selectorInstance) {
    selectorInstance = new ModelSelector();
  }
  return selectorInstance;
}
