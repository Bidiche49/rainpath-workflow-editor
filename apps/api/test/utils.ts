import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { CreateWorkflowInput } from '@rainpath/schemas';

import { AppModule } from '../src/app.module';
import { ZodValidationPipe } from '../src/common/zod-validation.pipe';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/** Boot a Nest app mirroring the production bootstrap (global Zod pipe). */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Remove all rows; order respects the ActionLog → Workflow foreign key. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.actionLog.deleteMany();
  await prisma.workflow.deleteMany();
}

/** A valid create-workflow payload (minimal Start → End graph). */
export function workflowPayload(overrides: Partial<CreateWorkflowInput> = {}): CreateWorkflowInput {
  return {
    name: 'Workflow de test',
    description: 'Créé par les tests e2e',
    settings: { notificationEmail: 'secretariat@labo.fr' },
    graph: {
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'end', type: 'end', position: { x: 0, y: 200 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 'start', target: 'end' }],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    ...overrides,
  };
}
