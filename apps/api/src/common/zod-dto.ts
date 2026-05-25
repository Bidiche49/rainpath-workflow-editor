import type { z, ZodTypeAny } from 'zod';

/**
 * Runtime carrier so a Zod schema can travel as a Nest DTO `metatype`.
 *
 * The global {@link ZodValidationPipe} reads the static `zodSchema` off the DTO
 * class to know how to validate the corresponding argument — this is what lets
 * a single global pipe pick the right schema per route, with zero Zod defined
 * inline in the API layer (all schemas come from `@rainpath/schemas`).
 */
export interface ZodDtoStatic<TOutput = unknown> {
  new (): TOutput;
  zodSchema: ZodTypeAny;
}

/**
 * Wrap a canonical Zod schema as a class usable as a Nest DTO type.
 *
 * Usage: `export class CreateFooDto extends createZodDto(CreateFooSchema) {}`.
 * The class instance type is the schema's inferred output; the static
 * `zodSchema` is what the validation pipe consumes.
 */
export function createZodDto<T extends ZodTypeAny>(schema: T): ZodDtoStatic<z.infer<T>> {
  class ZodDto {
    static zodSchema: ZodTypeAny = schema;
  }
  return ZodDto as unknown as ZodDtoStatic<z.infer<T>>;
}
