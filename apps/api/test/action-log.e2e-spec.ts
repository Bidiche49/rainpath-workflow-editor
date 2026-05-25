import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDatabase, workflowPayload } from './utils';

describe('ActionLog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let workflowId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const created = await request(app.getHttpServer())
      .post('/workflows')
      .send(workflowPayload())
      .expect(201);
    workflowId = created.body.id;
  });

  const server = (): App => app.getHttpServer();

  const logPayload = (patientId: string): Record<string, unknown> => ({
    patientId,
    workflowId,
    nodeId: 'email',
    channel: 'email',
    status: 'sent',
    message: `Relance pour ${patientId}`,
    notifiedTo: 'secretariat@labo.fr',
  });

  describe('POST /action-logs', () => {
    it('creates a log and assigns id and occurredAt', async () => {
      const res = await request(server()).post('/action-logs').send(logPayload('p1')).expect(201);

      expect(res.body).toMatchObject({
        patientId: 'p1',
        workflowId,
        channel: 'email',
        status: 'sent',
      });
      expect(typeof res.body.id).toBe('string');
      expect(res.body.occurredAt).toBeDefined();
    });

    it('rejects a non-channel type with a structured 400', async () => {
      const res = await request(server())
        .post('/action-logs')
        .send({ ...logPayload('p1'), channel: 'wait' })
        .expect(400);

      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.map((e: { path: string }) => e.path)).toContain('channel');
    });

    it('rejects a missing required field with 400', async () => {
      await request(server()).post('/action-logs').send({ patientId: 'p1' }).expect(400);
    });

    it('stores a minimal log (no message/notifiedTo) with an explicit occurredAt', async () => {
      const occurredAt = '2026-05-01T08:00:00.000Z';
      const res = await request(server())
        .post('/action-logs')
        .send({
          patientId: 'p2',
          workflowId,
          nodeId: 'sms',
          channel: 'sms',
          status: 'pending',
          occurredAt,
        })
        .expect(201);

      expect(res.body.message).toBeUndefined();
      expect(res.body.notifiedTo).toBeUndefined();
      expect(res.body.occurredAt).toBe(occurredAt);

      // Round-trip: a row with null message/notifiedTo maps back without the keys.
      const fetched = await request(server()).get('/action-logs?patientId=p2').expect(200);
      expect(fetched.body[0].message).toBeUndefined();
      expect(fetched.body[0].notifiedTo).toBeUndefined();
    });
  });

  describe('PATCH /action-logs/:id', () => {
    it('fires a scheduled log in place (pending → sent), no duplicate', async () => {
      const created = await request(server())
        .post('/action-logs')
        .send({ ...logPayload('p1'), status: 'pending', message: 'Email planifié' })
        .expect(201);

      const occurredAt = '2026-05-25T10:00:00.000Z';
      const patched = await request(server())
        .patch(`/action-logs/${created.body.id}`)
        .send({ status: 'sent', message: 'Email envoyé', occurredAt })
        .expect(200);

      expect(patched.body).toMatchObject({
        id: created.body.id,
        status: 'sent',
        message: 'Email envoyé',
      });
      expect(patched.body.occurredAt).toBe(occurredAt);

      const all = await request(server()).get('/action-logs?patientId=p1').expect(200);
      expect(all.body).toHaveLength(1);
      expect(all.body[0].status).toBe('sent');
    });

    it('returns 404 when patching a missing log', async () => {
      await request(server()).patch('/action-logs/nope').send({ status: 'sent' }).expect(404);
    });

    it('rejects an invalid status with a structured 400', async () => {
      const created = await request(server())
        .post('/action-logs')
        .send(logPayload('p1'))
        .expect(201);
      await request(server())
        .patch(`/action-logs/${created.body.id}`)
        .send({ status: 'bogus' })
        .expect(400);
    });
  });

  describe('GET /action-logs', () => {
    it('filters by patientId and stays coherent with what POST stored', async () => {
      const created = await request(server())
        .post('/action-logs')
        .send(logPayload('alice'))
        .expect(201);
      await request(server()).post('/action-logs').send(logPayload('bob')).expect(201);

      const res = await request(server()).get('/action-logs?patientId=alice').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual(created.body);
    });

    it('returns every log when no patientId filter is given', async () => {
      await request(server()).post('/action-logs').send(logPayload('alice')).expect(201);
      await request(server()).post('/action-logs').send(logPayload('bob')).expect(201);

      const res = await request(server()).get('/action-logs').expect(200);
      expect(res.body).toHaveLength(2);
    });

    it('returns an empty array for a patient with no logs', async () => {
      const res = await request(server()).get('/action-logs?patientId=ghost').expect(200);
      expect(res.body).toEqual([]);
    });
  });
});
