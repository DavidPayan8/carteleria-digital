import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import { auditRouter } from "./modules/audit/audit.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { locationsRouter } from "./modules/locations/locations.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { organizationsRouter } from "./modules/organizations/organizations.routes";
import { playerRouter } from "./modules/player/player.routes";
import { playlistsRouter } from "./modules/playlists/playlists.routes";
import { schedulesRouter } from "./modules/schedules/schedules.routes";
import { screensRouter } from "./modules/screens/screens.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/screens", screensRouter);
app.use("/api/media", mediaRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/player", playerRouter);
app.use("/api/audit", auditRouter);

app.use(errorHandler);
