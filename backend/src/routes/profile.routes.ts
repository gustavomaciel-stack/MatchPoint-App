import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/users/:id/profile', authMiddleware, profileController.get);
router.put('/users/:id/rating', authMiddleware, profileController.rate);
router.delete('/users/:id/rating', authMiddleware, profileController.unrate);
router.get('/ranking', authMiddleware, profileController.ranking);

export default router;
