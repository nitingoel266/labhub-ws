import { Response } from 'express';

export const sendResponse = (res: Response, data: any, errMsg?: string) => {
  const isValid = data !== null && !errMsg;

  let respObj: any = {
    status: isValid ? 'ok' : 'error',
  }
  if (isValid) {
    respObj['data'] = data;
  } else {
    if (data) {
      respObj = { ...respObj, ...data };
    }

    // res.status(500);
    respObj['message'] = errMsg || '';
  }

  // Disable caching for content files
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache'); // HTTP/1.0
  res.header('Expires', '0'); // Proxies

  res.json(respObj);
};
