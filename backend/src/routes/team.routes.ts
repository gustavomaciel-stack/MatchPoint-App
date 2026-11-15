import { Router } from 'express';
import type { Request, Response } from 'express';
import { teamController } from '../controllers/teamController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

const authenticated = (handler: (req: Request, res: Response) => Promise<Response>) =>
  [authMiddleware, (req: Request, res: Response, next: (error: unknown) => void) => {
    void handler(req, res).catch(next);
  }] as const;

router.get('/teams', ...authenticated(teamController.list));
router.post('/teams', ...authenticated(teamController.create));
router.get('/team-matches', ...authenticated(teamController.matches));
router.post('/team-matches', ...authenticated(teamController.publish));
router.post('/team-matches/:id/accept', ...authenticated(teamController.accept));
router.patch('/team-matches/:id/cancel', ...authenticated(teamController.cancel));

export default router;
