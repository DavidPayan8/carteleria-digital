import crypto from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { getReadSasUrl } from "../../utils/azureBlob";
import { resolveActiveSchedule } from "../../utils/scheduleResolver";

export const getCurrentPlaylist = asyncHandler(async (req, res) => {
  const screenId = req.screenId as string;
  const { screen, activeSchedule } = await resolveActiveSchedule(screenId);

  await prisma.screen.update({
    where: { id: screenId },
    data: { lastSeenAt: new Date(), lastSeenIp: req.ip, playerVersion: req.header("x-player-version") },
  });
  await prisma.screenHeartbeat.create({
    data: {
      screenId,
      ip: req.ip,
      playerVersion: req.header("x-player-version"),
      activePlaylistId: activeSchedule?.playlistId,
    },
  });

  if (!activeSchedule) {
    res.json({ playlist: null, pollingIntervalSeconds: screen.pollingIntervalSeconds });
    return;
  }

  const playlist = activeSchedule.playlist;
  const versionHash = crypto
    .createHash("sha1")
    .update(JSON.stringify(playlist.items.map((i) => [i.id, i.sortOrder, i.mediaId])))
    .digest("hex");

  res.json({
    pollingIntervalSeconds: screen.pollingIntervalSeconds,
    playlist: {
      id: playlist.id,
      name: playlist.name,
      version: versionHash,
      defaultItemDurationSeconds: playlist.defaultItemDurationSeconds,
      orientation: screen.orientation,
      items: playlist.items.map((item) => ({
        id: item.id,
        type: item.media.type === 1 ? "video" : "image",
        durationSeconds: item.durationSecondsOverride ?? item.media.durationSeconds ?? playlist.defaultItemDurationSeconds,
        transitionType: item.transitionType,
        url: getReadSasUrl({
          containerName: item.media.blobContainer,
          blobPath: item.media.blobPath,
          expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
        }),
      })),
    },
  });
});
