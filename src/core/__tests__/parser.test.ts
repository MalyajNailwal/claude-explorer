import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ClaudeDataParser } from '../parser.js';

describe('ClaudeDataParser', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'claude-explorer-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads a valid export', async () => {
    writeFileSync(
      join(dir, 'conversations.json'),
      JSON.stringify([
        {
          uuid: 'c1',
          name: 'Test',
          summary: '',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          account: { uuid: 'a1' },
          chat_messages: [{ uuid: 'm1', text: 'hi', content: [], sender: 'human', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', attachments: [], files: [] }],
        },
      ])
    );
    writeFileSync(join(dir, 'projects.json'), '[]');
    writeFileSync(join(dir, 'users.json'), '[]');

    const parser = new ClaudeDataParser(dir);
    await parser.load();

    expect(parser.getConversations()).toHaveLength(1);
    expect(parser.getConversation('c1')?.name).toBe('Test');
    expect(parser.getStats().messages.total).toBe(1);
  });

  it('survives missing files', async () => {
    const parser = new ClaudeDataParser(dir);
    await parser.load();
    expect(parser.getConversations()).toEqual([]);
    expect(parser.getStats().totalConversations).toBe(0);
  });

  it('survives malformed JSON', async () => {
    writeFileSync(join(dir, 'conversations.json'), '{not valid json');
    const parser = new ClaudeDataParser(dir);
    await parser.load();
    expect(parser.getConversations()).toEqual([]);
  });

  it('rejects non-array JSON', async () => {
    writeFileSync(join(dir, 'conversations.json'), '{"foo": "bar"}');
    const parser = new ClaudeDataParser(dir);
    await parser.load();
    expect(parser.getConversations()).toEqual([]);
  });

  it('survives empty files', async () => {
    writeFileSync(join(dir, 'conversations.json'), '');
    const parser = new ClaudeDataParser(dir);
    await parser.load();
    expect(parser.getConversations()).toEqual([]);
  });
});
