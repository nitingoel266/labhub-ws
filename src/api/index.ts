import { Request, Response } from 'express';

const indexHandler = (req: Request, res: Response) => {
  const respObj = {
    home: '/',
  };
  res.json(respObj)
};

export default indexHandler;
