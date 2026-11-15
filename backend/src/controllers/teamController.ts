import type { Request, Response } from 'express';
import { teamService } from '../services/teamService.js';

export const teamController = {
  list: async (req: Request, res: Response) => res.json(await teamService.list(req.user!.userId)),
  matches: async (_req: Request, res: Response) => res.json(await teamService.matches()),
  create: async (req: Request, res: Response) =>
    res.status(201).json(await teamService.create(req.user!.userId, req.body ?? {})),
  publish: async (req: Request, res: Response) =>
    res.status(201).json(await teamService.publish(req.user!.userId, req.body ?? {})),
  accept: async (req: Request, res: Response) =>
    res.json(await teamService.accept(req.user!.userId, String(req.params.id), req.body?.teamId)),
  cancel: async (req: Request, res: Response) =>
    res.json(await teamService.cancel(req.user!.userId, String(req.params.id))),
};
