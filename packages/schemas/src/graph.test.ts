import { describe, expect, it } from 'vitest';

import { ChannelNodeDataSchema, EdgeSchema, NodeSchema, WorkflowGraphSchema } from './graph';

describe('NodeSchema', () => {
  it('parses an email node and defaults notifySecretariat to true', () => {
    const parsed = NodeSchema.parse({
      id: 'n1',
      type: 'email',
      position: { x: 0, y: 0 },
      data: { content: 'Bonjour' },
    });

    expect(parsed.type).toBe('email');
    if (parsed.type === 'email') {
      expect(parsed.data.notifySecretariat).toBe(true);
    }
  });

  it('applies the wait delay default', () => {
    const parsed = NodeSchema.parse({
      id: 'w1',
      type: 'wait',
      position: { x: 10, y: 20 },
      data: {},
    });

    expect(parsed.type).toBe('wait');
    if (parsed.type === 'wait') {
      expect(parsed.data.delay).toEqual({ value: 1, unit: 'days' });
    }
  });

  it('rejects an unknown node type', () => {
    const result = NodeSchema.safeParse({
      id: 'x',
      type: 'carrier-pigeon',
      position: { x: 0, y: 0 },
      data: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects a node without an id', () => {
    const result = NodeSchema.safeParse({
      id: '',
      type: 'start',
      position: { x: 0, y: 0 },
      data: {},
    });

    expect(result.success).toBe(false);
  });
});

describe('ChannelNodeDataSchema cross-field rule (ADR-004)', () => {
  it('rejects an override when notifySecretariat is disabled', () => {
    const result = ChannelNodeDataSchema.safeParse({
      notifySecretariat: false,
      notificationEmailOverride: 'secret@lab.fr',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['notificationEmailOverride']);
    }
  });

  it('accepts notifySecretariat disabled without an override', () => {
    const result = ChannelNodeDataSchema.safeParse({ notifySecretariat: false });
    expect(result.success).toBe(true);
  });

  it('accepts an override when notifySecretariat is enabled', () => {
    const result = ChannelNodeDataSchema.safeParse({
      notifySecretariat: true,
      notificationEmailOverride: 'suivi@lab.fr',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed override email', () => {
    const result = ChannelNodeDataSchema.safeParse({
      notifySecretariat: true,
      notificationEmailOverride: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('EdgeSchema', () => {
  it('accepts a condition branch edge with a sourceHandle', () => {
    const parsed = EdgeSchema.parse({
      id: 'e1',
      source: 'c1',
      target: 'n2',
      sourceHandle: 'yes',
    });
    expect(parsed.sourceHandle).toBe('yes');
  });

  it('accepts a linear edge without handles', () => {
    const parsed = EdgeSchema.parse({ id: 'e2', source: 'a', target: 'b' });
    expect(parsed.source).toBe('a');
  });
});

describe('WorkflowGraphSchema', () => {
  it('parses a complete graph', () => {
    const result = WorkflowGraphSchema.safeParse({
      nodes: [
        { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'c', type: 'condition', position: { x: 0, y: 100 }, data: {} },
        { id: 'e', type: 'end', position: { x: 0, y: 200 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 's', target: 'c' },
        { id: 'e2', source: 'c', target: 'e', sourceHandle: 'yes' },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-positive zoom', () => {
    const result = WorkflowGraphSchema.safeParse({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 0 },
    });
    expect(result.success).toBe(false);
  });
});
