import crypto from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getReadSasUrl } from "../../utils/azureBlob.js";
import { ActiveScheduleResult, resolveActiveSchedule } from "../../utils/scheduleResolver.js";

type PlaylistWithItems = NonNullable<ActiveScheduleResult>["playlist"];

async function buildPlaylistDto(playlist: PlaylistWithItems, defaultOrientation: number) {
  const versionHash = crypto
    .createHash("sha1")
    .update(JSON.stringify(playlist.items.map((i) => [i.id, i.sortOrder, i.mediaId])))
    .digest("hex");

  const items = await Promise.all(
    playlist.items.map(async (item) => ({
      id: item.id,
      type: item.media.type === 1 ? "video" : "image",
      durationSeconds: item.durationSecondsOverride ?? item.media.durationSeconds ?? playlist.defaultItemDurationSeconds,
      transitionType: item.transitionType,
      url: await getReadSasUrl({
        containerName: item.media.blobContainer,
        blobPath: item.media.blobPath,
        expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
      }),
    })),
  );

  return {
    id: playlist.id,
    name: playlist.name,
    version: versionHash,
    defaultItemDurationSeconds: playlist.defaultItemDurationSeconds,
    orientation: defaultOrientation,
    items,
  };
}

export const getCurrentPlaylist = asyncHandler(async (req, res) => {
  const screenId = req.screenId as string;
  const resolved = await resolveActiveSchedule(screenId);
  const { screen } = resolved;

  const activePlaylistId =
    resolved.layout === "single"
      ? resolved.activeSchedule?.playlistId
      : resolved.zones.find((z) => z.activeSchedule)?.activeSchedule?.playlistId;

  await prisma.screen.update({
    where: { id: screenId },
    data: { lastSeenAt: new Date(), lastSeenIp: req.ip, playerVersion: req.header("x-player-version") },
  });
  await prisma.screenHeartbeat.create({
    data: {
      screenId,
      ip: req.ip,
      playerVersion: req.header("x-player-version"),
      activePlaylistId,
    },
  });

  if (resolved.layout === "zones") {
    const zones = await Promise.all(
      resolved.zones.map(async ({ zone, activeSchedule }) => ({
        id: zone.id,
        x: new Prisma.Decimal(zone.x).toNumber(),
        y: new Prisma.Decimal(zone.y).toNumber(),
        width: new Prisma.Decimal(zone.width).toNumber(),
        height: new Prisma.Decimal(zone.height).toNumber(),
        zIndex: zone.zIndex,
        playlist: activeSchedule ? await buildPlaylistDto(activeSchedule.playlist, screen.orientation) : null,
      })),
    );
    res.json({ pollingIntervalSeconds: screen.pollingIntervalSeconds, layout: "zones", zones });
    return;
  }

  if (!resolved.activeSchedule) {
    res.json({ pollingIntervalSeconds: screen.pollingIntervalSeconds, layout: "single", playlist: null });
    return;
  }

  const playlist = await buildPlaylistDto(resolved.activeSchedule.playlist, screen.orientation);
  res.json({ pollingIntervalSeconds: screen.pollingIntervalSeconds, layout: "single", playlist });
});
