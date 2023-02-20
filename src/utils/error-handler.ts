import { Request, Response, NextFunction, RequestHandler } from 'express';
import { sendResponse } from './resp-utils';

const errHandler = (handler: any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handler(req, res, next);
  } catch(err: unknown) {
    let errMsg = 'errorHandler: unknown error';
    if (err instanceof Error) {
      errMsg = `errorHandler: ${err.message}`;
    }
    sendResponse(res.status(400), null, errMsg);
  }
};

const errorHandler = (handler: RequestHandler) => errHandler(handler);

export default errorHandler;
