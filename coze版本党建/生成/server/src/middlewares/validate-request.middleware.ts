import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export function validateRequest(schema: ZodTypeAny, source: 'body' | 'query' | 'params') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(result.error);
    }

    Object.assign(req[source], result.data);
    next();
  };
}
