import { CreateWorkflowSchema, UpdateWorkflowSchema } from '@rainpath/schemas';

import { createZodDto } from '../common/zod-dto';

/** POST /workflows body — validated against the canonical create schema. */
export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema) {}

/** PATCH /workflows/:id body — every field optional. */
export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema) {}
