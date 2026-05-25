import type { z } from 'zod';

/** Base URL of the NestJS API. Overridable per environment. */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** A single field-level validation issue, mirroring the API's `errors[]`. */
export interface ApiErrorDetail {
  path: string;
  message: string;
}

/**
 * Thrown when the API responds with a status >= 400. Carries the HTTP status,
 * a human-readable message, and (when present) the structured field errors
 * produced by the backend Zod validation pipe.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorDetail[] | undefined;

  constructor(status: number, message: string, errors?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function isErrorDetail(value: unknown): value is ApiErrorDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof (value as { path: unknown }).path === 'string' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

/** Reads the response body as JSON, tolerating empty or malformed payloads. */
async function readBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    return text.length > 0 ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extracts a message from an error body. The backend returns either the Zod
 * pipe shape `{ message: string, errors }` or NestJS's native
 * `{ statusCode, message, error }` where `message` can also be a `string[]`.
 */
function extractMessage(body: unknown, fallback: string): string {
  if (body !== null && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }
  return fallback.length > 0 ? fallback : 'Requête échouée';
}

function extractErrors(body: unknown): ApiErrorDetail[] | undefined {
  if (body !== null && typeof body === 'object' && 'errors' in body) {
    const errors = (body as { errors: unknown }).errors;
    if (Array.isArray(errors)) {
      const details = errors.filter(isErrorDetail);
      return details.length > 0 ? details : undefined;
    }
  }
  return undefined;
}

/**
 * Typed fetch wrapper. Issues the request, throws {@link ApiError} on a status
 * >= 400, and on success validates the JSON body at runtime with `schema`,
 * returning a value statically typed as `T`. Pass `z.void()` for endpoints
 * with an empty (e.g. 204) response.
 *
 * The return type is inferred from the schema's *output* (`z.infer`), so
 * schemas with defaults (e.g. `schemaVersion`) resolve to their post-parse
 * shape rather than the looser input shape.
 */
export async function apiFetch<S extends z.ZodTypeAny>(
  path: string,
  options: RequestInit,
  schema: S,
): Promise<z.infer<S>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const body = await readBody(response);
    throw new ApiError(
      response.status,
      extractMessage(body, response.statusText),
      extractErrors(body),
    );
  }

  const body = await readBody(response);
  return schema.parse(body);
}
