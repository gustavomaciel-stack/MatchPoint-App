import type { NextFunction, Request, Response } from 'express';
import { profileService } from '../services/profileService.js';

export const profileController = {
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await profileService.get(req.user!, req.params.id));
    } catch (err) {
      next(err);
    }
  },
  rate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await profileService.rate(req.user!.userId, req.params.id, req.body ?? {}));
    } catch (err) {
      next(err);
    }
  },
  unrate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await profileService.unrate(req.user!.userId, req.params.id));
    } catch (err) {
      next(err);
    }
  },
  ranking: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await profileService.ranking(req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
};
