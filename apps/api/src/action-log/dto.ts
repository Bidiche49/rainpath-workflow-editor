import { CreateActionLogSchema, UpdateActionLogSchema } from '@rainpath/schemas';

import { createZodDto } from '../common/zod-dto';

/** POST /action-logs body — validated against the canonical create schema. */
export class CreateActionLogDto extends createZodDto(CreateActionLogSchema) {}

/** PATCH /action-logs/:id body — every field optional. */
export class UpdateActionLogDto extends createZodDto(UpdateActionLogSchema) {}
