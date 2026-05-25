import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase, workflowPayload } from './utils';

describe('Workflow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  const server = (): App => app.getHttpServer();

  describe('POST /workflows', () => {
    it('creates a workflow and echoes the normalized entity', async () => {
      const payload = workflowPayload();
      const res = await request(server()).post('/workflows').send(payload).expect(201);

      expect(res.body).toMatchObject({
        name: payload.name,
        description: payload.description,
        schemaVersion: 1,
        settings: payload.settings,
      });
      expect(typeof res.body.id).toBe('string');
      expect(res.body.graph.nodes).toHaveLength(2);
      expect(res.body.createdAt).toBeDefined();
    });

    it('rejects an invalid payload with a structured 400', async () => {
      const res = await request(server()).post('/workflows').send({ name: '' }).expect(400);

      expect(res.body.message).toBe('Validation failed');
      expect(Array.isArray(res.body.errors)).toBe(true);
      const paths = res.body.errors.map((e: { path: string }) => e.path);
      expect(paths).toEqual(expect.arrayContaining(['name', 'graph', 'settings']));
    });

    it('creates a workflow without an optional description', async () => {
      const noDescription = workflowPayload();
      delete noDescription.description;
      const res = await request(server()).post('/workflows').send(noDescription).expect(201);

      expect(res.body.description).toBeUndefined();
      // Round-trip: a row with a null description maps back without the key.
      const fetched = await request(server()).get(`/workflows/${res.body.id}`).expect(200);
      expect(fetched.body.description).toBeUndefined();
    });
  });

  describe('GET /workflows', () => {
    it('lists created workflows', async () => {
      await request(server())
        .post('/workflows')
        .send(workflowPayload({ name: 'A' }))
        .expect(201);
      await request(server())
        .post('/workflows')
        .send(workflowPayload({ name: 'B' }))
        .expect(201);

      const res = await request(server()).get('/workflows').expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /workflows/:id', () => {
    it('returns the same entity that POST produced (round-trip coherence)', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);

      const fetched = await request(server()).get(`/workflows/${created.body.id}`).expect(200);
      expect(fetched.body).toEqual(created.body);
    });

    it('returns 404 for an unknown id', async () => {
      await request(server()).get('/workflows/unknown-id').expect(404);
    });
  });

  describe('PATCH /workflows/:id', () => {
    it('updates a field and returns the updated entity', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);

      const res = await request(server())
        .patch(`/workflows/${created.body.id}`)
        .send({ name: 'Nom modifié' })
        .expect(200);

      expect(res.body.name).toBe('Nom modifié');
      expect(res.body.id).toBe(created.body.id);
    });

    it('updates every mutable field at once', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);
      const next = workflowPayload({ name: 'Tout changé', description: 'Nouvelle description' });

      const res = await request(server())
        .patch(`/workflows/${created.body.id}`)
        .send({
          name: next.name,
          description: next.description,
          graph: next.graph,
          settings: { notificationEmail: 'autre@labo.fr' },
        })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'Tout changé',
        description: 'Nouvelle description',
        settings: { notificationEmail: 'autre@labo.fr' },
      });
    });

    it('applies a partial patch that omits the name', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);

      const res = await request(server())
        .patch(`/workflows/${created.body.id}`)
        .send({ settings: { notificationEmail: 'partiel@labo.fr' } })
        .expect(200);

      expect(res.body.name).toBe(created.body.name);
      expect(res.body.settings.notificationEmail).toBe('partiel@labo.fr');
    });

    it('rejects an invalid patch with 400', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);

      await request(server())
        .patch(`/workflows/${created.body.id}`)
        .send({ settings: { notificationEmail: 'not-an-email' } })
        .expect(400);
    });

    it('returns 404 when patching an unknown id', async () => {
      await request(server()).patch('/workflows/unknown-id').send({ name: 'x' }).expect(404);
    });
  });

  describe('DELETE /workflows/:id', () => {
    it('deletes a workflow then 404s on subsequent reads', async () => {
      const created = await request(server())
        .post('/workflows')
        .send(workflowPayload())
        .expect(201);

      await request(server()).delete(`/workflows/${created.body.id}`).expect(204);
      await request(server()).get(`/workflows/${created.body.id}`).expect(404);
    });

    it('returns 404 when deleting an unknown id', async () => {
      await request(server()).delete('/workflows/unknown-id').expect(404);
    });
  });
});
