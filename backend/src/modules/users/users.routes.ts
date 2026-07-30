import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { createUser, deleteUser, listUsers, updateUser } from "./users.controller.js";

// Gestión fina (SuperAdmin sin restricción, OrgAdmin solo su propia organización) se aplica
// dentro de users.controller.ts; aquí solo se descarta de entrada a LocationAdmin/Viewer.
export const usersRouter = Router();

const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin);

usersRouter.use(requireAuth);
usersRouter.get("/", canManage, listUsers);
usersRouter.post("/", canManage, createUser);
usersRouter.patch("/:id", canManage, updateUser);
usersRouter.delete("/:id", canManage, deleteUser);
