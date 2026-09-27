import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

type RequestWithQuery = Request & { validatedQuery?: unknown };

/**
 * Parses part of the request with a Zod schema. Parsed body/params replace the
 * raw input; parsed query strings are stored on `req.validatedQuery` because
 * `req.query` is treated as read-only in newer Express versions.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    if (source === 'query') (req as RequestWithQuery).validatedQuery = result.data;
    else if (source === 'body') req.body = result.data;
    else req.params = result.data;
    return next();
  };

export function getValidatedQuery<T>(req: Request): T {
  return (req as RequestWithQuery).validatedQuery as T;
}
