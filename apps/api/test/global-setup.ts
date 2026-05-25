import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Create a pristine test database once before the suite: drop any leftover
 * `test.db` then apply the committed migrations to it. Each spec then cleans
 * its own rows in `beforeEach`, so tests stay independent.
 */
export default function globalSetup(): void {
  const apiRoot = join(__dirname, '..');
  const testDb = join(apiRoot, 'prisma', 'test.db');

  for (const file of [testDb, `${testDb}-journal`]) {
    if (existsSync(file)) {
      rmSync(file, { force: true });
    }
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  });
}
