import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { loginRateLimiter } from "../../middleware/rateLimit.js";
import { changePassword, login } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, login);
authRouter.patch("/password", requireAuth, changePassword);
