import { describe, expect, it } from 'vitest';

import { migrateGraph } from './migrations';
import {
  CreateWorkflowSchema,
  LATEST_SCHEMA_VERSION,
  UpdateWorkflowSchema,
  WorkflowSchema,
} from './workflow';

const validGraph = {
  nodes: [
    { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'e', type: 'end', position: { x: 0, y: 200 }, data: {} },
  ],
  edges: [{ id: 'e1', source: 's', target: 'e' }],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const validSettings = { notificationEmail: 'secretariat@lab.fr' };

describe('WorkflowSchema', () => {
  it('parses a complete workflow and coerces ISO date strings', () => {
    const parsed = WorkflowSchema.parse({
      id: 'wf_1',
      name: 'Relance standard',
      schemaVersion: 1,
      graph: validGraph,
      settings: validSettings,
      createdAt: '2026-05-25T10:00:00.000Z',
      updatedAt: '2026-05-25T10:00:00.000Z',
    });

    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('defaults schemaVersion to the latest', () => {
    const parsed = WorkflowSchema.parse({
      id: 'wf_2',
      name: 'Sans version',
      graph: validGraph,
      settings: validSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(parsed.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
  });

  it('rejects an invalid notification email in settings', () => {
    const result = WorkflowSchema.safeParse({
      id: 'wf_3',
      name: 'Email cassé',
      graph: validGraph,
      settings: { notificationEmail: 'nope' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = WorkflowSchema.safeParse({
      id: 'wf_4',
      name: '',
      graph: validGraph,
      settings: validSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});

describe('Create / Update payloads', () => {
  it('accepts a create payload without description', () => {
    const result = CreateWorkflowSchema.safeParse({
      name: 'Nouveau',
      graph: validGraph,
      settings: validSettings,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty update payload', () => {
    const result = UpdateWorkflowSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('migrateGraph', () => {
  it('returns a parsed graph at the latest version (identity for v1)', () => {
    const migrated = migrateGraph(validGraph, 1);
    expect(migrated.nodes).toHaveLength(2);
  });

  it('throws when the stored version is newer than supported', () => {
    expect(() => migrateGraph(validGraph, LATEST_SCHEMA_VERSION + 1)).toThrow();
  });
});
