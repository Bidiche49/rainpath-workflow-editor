import { WorkflowGraphSchema, type WorkflowGraph } from '../graph';
import { LATEST_SCHEMA_VERSION } from '../workflow';

/**
 * Graph schema migrations (ADR-002).
 *
 * Read path is always: `schemaVersion → migrateGraph → WorkflowGraphSchema.parse`.
 * Only v1 exists today, so the registry is empty and migration is the identity;
 * future steps register a function under their source version key.
 */
export type MigrationStep = (graph: unknown) => unknown;

export const MIGRATIONS: Record<number, MigrationStep> = {
  // 1: (graph) => migrateV1ToV2(graph),
};

/**
 * Pure migration runner — chains the registered steps from `fromVersion` up to
 * `toVersion`. Kept dependency-injected (migrations + target version as args)
 * so the chaining logic is testable without a real future schema version.
 */
export function applyMigrations(
  graph: unknown,
  fromVersion: number,
  toVersion: number,
  migrations: Record<number, MigrationStep>,
): unknown {
  if (fromVersion > toVersion) {
    throw new Error(`schemaVersion ${fromVersion} is newer than supported ${toVersion}`);
  }

  let current = graph;
  for (let version = fromVersion; version < toVersion; version++) {
    const step = migrations[version];
    if (!step) {
      throw new Error(`missing migration step from schemaVersion ${version}`);
    }
    current = step(current);
  }

  return current;
}

/**
 * Bring a stored graph (at `fromVersion`) up to the latest schema, then parse.
 * Throws if the stored version is newer than the code understands.
 */
export function migrateGraph(graph: unknown, fromVersion: number): WorkflowGraph {
  const migrated = applyMigrations(graph, fromVersion, LATEST_SCHEMA_VERSION, MIGRATIONS);
  return WorkflowGraphSchema.parse(migrated);
}
