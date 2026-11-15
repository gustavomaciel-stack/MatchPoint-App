import { Router } from "express";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import matchRoutes from "./match.routes.js";
import userRoutes from "./user.routes.js";
import teamRoutes from "./team.routes.js";

const router = Router();

router.use(authRoutes);
router.use(healthRoutes);
router.use(userRoutes);
router.use(matchRoutes);
router.use(teamRoutes);

export default router;
