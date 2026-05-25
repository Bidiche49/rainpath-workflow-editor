import { CreateActionLogSchema } from '@rainpath/schemas';

import { createZodDto } from '../common/zod-dto';

/** POST /action-logs body — validated against the canonical create schema. */
export class CreateActionLogDto extends createZodDto(CreateActionLogSchema) {}
