import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';

import { createZodDto } from './zod-dto';
import { ZodValidationPipe } from './zod-validation.pipe';

const pipe = new ZodValidationPipe();

const meta = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
  data: undefined,
});

describe('ZodValidationPipe', () => {
  it('passes through arguments whose metatype carries no Zod schema', () => {
    expect(pipe.transform('raw', meta(String))).toBe('raw');
    expect(pipe.transform({ a: 1 }, meta(undefined))).toEqual({ a: 1 });
  });

  it('parses and returns the validated value for a Zod DTO', () => {
    class Dto extends createZodDto(z.object({ name: z.string() })) {}
    expect(pipe.transform({ name: 'ok', extra: 1 }, meta(Dto))).toEqual({ name: 'ok' });
  });

  it('turns a ZodError into a structured BadRequestException', () => {
    class Dto extends createZodDto(z.object({ name: z.string() })) {}
    try {
      pipe.transform({ name: 42 }, meta(Dto));
      fail('expected a BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: { path: string; message: string }[];
      };
      expect(response.message).toBe('Validation failed');
      expect(response.errors[0]?.path).toBe('name');
    }
  });

  it('rethrows non-Zod errors instead of masking them as 400', () => {
    const Dto = createZodDto(
      z.string().transform(() => {
        throw new Error('boom');
      }),
    );
    expect(() =>
      pipe.transform('value', meta(Dto as unknown as ArgumentMetadata['metatype'])),
    ).toThrow('boom');
  });
});
