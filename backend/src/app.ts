import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";

// BigInt (Media.sizeBytes) no es serializable por JSON.stringify de forma nativa;
// el frontend espera este campo como string (ver models.ts).
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function () {
  return this.toString();
};
import { errorHandler } from "./middleware/errorHandler.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { locationsRouter } from "./modules/locations/locations.routes.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { playerRouter } from "./modules/player/player.routes.js";
import { playlistsRouter } from "./modules/playlists/playlists.routes.js";
import { schedulesRouter } from "./modules/schedules/schedules.routes.js";
import { screenGroupsRouter } from "./modules/screenGroups/screenGroups.routes.js";
import { screenZonesRouter } from "./modules/screenZones/screenZones.routes.js";
import { screensRouter } from "./modules/screens/screens.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const app = express();

app.use(helmet());
// Retry-After no está en la lista segura de headers que el navegador expone a JS por
// defecto en peticiones cross-origin; sin esto el frontend no puede leer cuánto falta
// para que expire el rate limit de login.
app.use(cors({ origin: env.CORS_ORIGINS, exposedHeaders: ["Retry-After"] }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/screens", screensRouter);
app.use("/api/screen-zones", screenZonesRouter);
app.use("/api/screen-groups", screenGroupsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/player", playerRouter);
app.use("/api/audit", auditRouter);
app.use("/api/users", usersRouter);

app.use(errorHandler);
