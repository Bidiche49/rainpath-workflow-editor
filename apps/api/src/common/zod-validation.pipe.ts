import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodTypeAny } from 'zod';

interface ZodSchemaCarrier {
  zodSchema: ZodTypeAny;
}

/** True when the argument `metatype` is a DTO created via `createZodDto`. */
function carriesZodSchema(metatype: unknown): metatype is ZodSchemaCarrier {
  return (
    typeof metatype === 'function' &&
    'zodSchema' in metatype &&
    typeof (metatype as { zodSchema?: unknown }).zodSchema === 'object'
  );
}

/**
 * Global validation pipe.
 *
 * Validates any argument whose DTO type carries a Zod schema (see
 * {@link createZodDto}); everything else (primitive params, untyped queries)
 * passes through untouched. A `ZodError` is surfaced as a `400` with a
 * structured `{ errors: [{ path, message }] }` body.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!carriesZodSchema(metadata.metatype)) {
      return value;
    }

    try {
      return metadata.metatype.zodSchema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      throw error;
    }
  }
}
