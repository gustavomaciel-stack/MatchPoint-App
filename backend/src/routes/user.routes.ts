import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/admin.js';

const router = Router();

router.post('/users', userController.register);
router.get('/users', authMiddleware, adminOnly, userController.list);
router.get('/users/:id', authMiddleware, adminOnly, userController.getById);
router.delete('/users/:id', authMiddleware, adminOnly, userController.remove);

export default router;
