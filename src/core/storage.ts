/**
 * IndexedDB storage wrapper for browser data persistence
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ClaudeExplorerDB extends DBSchema {
  apiKeys: {
    key: string;
    value: {
      provider: string;
      key: string;
      addedAt: string;
    };
    indexes: { 'by-provider': string };
  };
  chatHistory: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      userMessage: string;
      assistantResponse: string;
      model: string;
      provider: string;
      tokensUsed?: number;
    };
    indexes: { 'by-timestamp': string; 'by-model': string };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };
}

class StorageManager {
  private db: IDBPDatabase<ClaudeExplorerDB> | null = null;
  private dbName = 'claude-explorer-db';
  private dbVersion = 1;

  /**
   * Initialize database connection
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<ClaudeExplorerDB>(this.dbName, this.dbVersion, {
      upgrade(db) {
        // API Keys store
        if (!db.objectStoreNames.contains('apiKeys')) {
          const keyStore = db.createObjectStore('apiKeys', { keyPath: 'provider' });
          keyStore.createIndex('by-provider', 'provider');
        }

        // Chat history store
        if (!db.objectStoreNames.contains('chatHistory')) {
          const historyStore = db.createObjectStore('chatHistory', { keyPath: 'id' });
          historyStore.createIndex('by-timestamp', 'timestamp');
          historyStore.createIndex('by-model', 'model');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  /**
   * API Keys Management
   */
  async saveApiKey(provider: string, key: string): Promise<void> {
    await this.init();
    await this.db!.put('apiKeys', {
      provider,
      key,
      addedAt: new Date().toISOString(),
    });
  }

  async getApiKey(provider: string): Promise<string | undefined> {
    await this.init();
    const result = await this.db!.get('apiKeys', provider);
    return result?.key;
  }

  async getAllApiKeys(): Promise<Array<{ provider: string; addedAt: string }>> {
    await this.init();
    const keys = await this.db!.getAll('apiKeys');
    return keys.map(k => ({ provider: k.provider, addedAt: k.addedAt }));
  }

  async deleteApiKey(provider: string): Promise<void> {
    await this.init();
    await this.db!.delete('apiKeys', provider);
  }

  /**
   * Chat History Management
   */
  async saveChatMessage(
    userMessage: string,
    assistantResponse: string,
    model: string,
    provider: string,
    tokensUsed?: number
  ): Promise<string> {
    await this.init();
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db!.add('chatHistory', {
      id,
      timestamp: new Date().toISOString(),
      userMessage,
      assistantResponse,
      model,
      provider,
      tokensUsed,
    });

    return id;
  }

  async getChatHistory(limit: number = 100): Promise<any[]> {
    await this.init();
    const tx = this.db!.transaction('chatHistory', 'readonly');
    const index = tx.store.index('by-timestamp');
    const messages = await index.getAll();
    return messages.slice(-limit).reverse();
  }

  async clearChatHistory(): Promise<void> {
    await this.init();
    await this.db!.clear('chatHistory');
  }

  /**
   * Settings Management
   */
  async saveSetting(key: string, value: unknown): Promise<void> {
    await this.init();
    await this.db!.put('settings', { key, value });
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    await this.init();
    const result = await this.db!.get('settings', key);
    return result?.value as T | undefined;
  }

  /**
   * Nuclear Option - Clear Everything
   */
  async clearAll(): Promise<void> {
    await this.init();
    await this.db!.clear('apiKeys');
    await this.db!.clear('chatHistory');
    await this.db!.clear('settings');
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    apiKeysCount: number;
    chatHistoryCount: number;
    settingsCount: number;
  }> {
    await this.init();
    const [apiKeys, chatHistory, settings] = await Promise.all([
      this.db!.count('apiKeys'),
      this.db!.count('chatHistory'),
      this.db!.count('settings'),
    ]);

    return {
      apiKeysCount: apiKeys,
      chatHistoryCount: chatHistory,
      settingsCount: settings,
    };
  }
}

export const storageManager = new StorageManager();
