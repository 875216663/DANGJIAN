import type { NextFunction, Request, Response } from 'express';

export function asyncHandler<
  TReq extends Request = Request,
  TRes extends Response = Response,
>(handler: (req: TReq, res: TRes, next: NextFunction) => Promise<unknown>) {
  return (req: TReq, res: TRes, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
