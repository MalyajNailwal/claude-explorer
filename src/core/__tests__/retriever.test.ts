import { describe, it, expect } from 'vitest';
import {
  ContextRetriever,
  extractQueryTerms,
  extractDateIntent,
  excerpt,
} from '../retriever.js';
import { SearchIndexer } from '../indexer.js';
import { Conversation } from '../types.js';

function makeConversation(
  overrides: Partial<Conversation> & { uuid: string }
): Conversation {
  return {
    name: '',
    summary: '',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    account: { uuid: 'acc-1' },
    chat_messages: [],
    ...overrides,
  } as Conversation;
}

function makeMessage(text: string, sender: 'human' | 'assistant' = 'human') {
  return {
    uuid: `msg-${Math.random().toString(36).slice(2)}`,
    text,
    content: [],
    sender,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    attachments: [],
    files: [],
  };
}

describe('extractQueryTerms', () => {
  it('keeps short but meaningful tokens like SQL, AWS, JWT', () => {
    const terms = extractQueryTerms('how do I use SQL with AWS and JWT?');
    expect(terms).toContain('sql');
    expect(terms).toContain('aws');
    expect(terms).toContain('jwt');
  });

  it('drops stopwords', () => {
    const terms = extractQueryTerms('what did we do with the database?');
    expect(terms).toContain('database');
    expect(terms).not.toContain('what');
    expect(terms).not.toContain('the');
    expect(terms).not.toContain('with');
  });

  it('returns empty array for stopword-only queries', () => {
    expect(extractQueryTerms('what is this about')).toEqual([]);
  });
});

describe('extractDateIntent', () => {
  it('does not treat "may" as a month when used as a verb', () => {
    expect(extractDateIntent('which approach may work best?')).toBeNull();
  });

  it('detects explicit temporal month phrasing', () => {
    expect(extractDateIntent('conversations from May')).toEqual({
      type: 'month',
      value: 'may',
    });
    expect(extractDateIntent('what did we discuss in march?')).toEqual({
      type: 'month',
      value: 'march',
    });
  });

  it('detects recency and year intent', () => {
    expect(extractDateIntent('what did I ask recently?')).toEqual({
      type: 'recent',
    });
    expect(extractDateIntent('docker conversations from 2024')).toEqual({
      type: 'year',
      value: '2024',
    });
  });
});

describe('excerpt', () => {
  it('returns short text unchanged', () => {
    expect(excerpt('hello world', 0, 100)).toBe('hello world');
  });

  it('truncates at word boundaries around the match', () => {
    const text = 'word '.repeat(200).trim();
    const result = excerpt(text, 500, 100);
    expect(result.length).toBeLessThanOrEqual(102); // maxLen + ellipses
    // no shredded tokens: every inner chunk is a whole "word"
    for (const part of result.replace(/…/g, '').trim().split(/\s+/)) {
      expect(part).toBe('word');
    }
  });
});

describe('ContextRetriever', () => {
  const conversations = [
    makeConversation({
      uuid: 'conv-docker',
      name: 'Docker deployment help',
      created_at: '2026-05-10T00:00:00Z',
      chat_messages: [
        makeMessage('How do I write a Dockerfile for a node app?'),
        makeMessage('Use a multi-stage build with node:22-slim.', 'assistant'),
      ],
    }),
    makeConversation({
      uuid: 'conv-cooking',
      name: 'Pasta recipes',
      created_at: '2026-06-20T00:00:00Z',
      chat_messages: [makeMessage('Give me a carbonara recipe')],
    }),
  ];

  function buildRetriever() {
    const indexer = new SearchIndexer();
    indexer.buildIndex(conversations);
    return new ContextRetriever(indexer);
  }

  it('retrieves the relevant conversation for a topical query', () => {
    const results = buildRetriever().retrieve('docker deployment');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].uuid).toBe('conv-docker');
    expect(results[0].snippets.length).toBeGreaterThan(0);
  });

  it('includes the conversation id and data delimiters in built context', () => {
    const context = buildRetriever().buildContext('dockerfile node');
    expect(context).toContain('conversation-id: conv-docker');
    expect(context).toContain('<archive>');
    expect(context).toContain('</archive>');
  });

  it('returns empty context when nothing matches', () => {
    expect(buildRetriever().buildContext('quantum blockchain llamas')).toBe('');
  });

  it('falls back to unfiltered results when a date filter matches nothing', () => {
    // "from 2024" matches no conversation dates, but results should not be empty
    const results = buildRetriever().retrieve('docker deployment from 2024');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].uuid).toBe('conv-docker');
  });

  it('handles an unbuilt index without throwing', () => {
    const retriever = new ContextRetriever(new SearchIndexer());
    expect(retriever.buildContext('docker')).toBe('');
  });
});
