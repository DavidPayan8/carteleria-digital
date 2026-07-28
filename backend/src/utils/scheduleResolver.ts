import { DateTime } from "luxon";
import { prisma } from "../config/prisma";

// Luxon weekday: 1=Lunes ... 7=Domingo. Bitmask de Schedules.daysOfWeek:
// 1=Lun,2=Mar,4=Mie,8=Jue,16=Vie,32=Sab,64=Dom
const DAY_BIT_BY_LUXON_WEEKDAY: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
  6: 32,
  7: 64,
};

function isWithinTime(startTime: Date, endTime: Date, nowHHMMSS: string): boolean {
  const start = DateTime.fromJSDate(startTime, { zone: "utc" }).toFormat("HH:mm:ss");
  const end = DateTime.fromJSDate(endTime, { zone: "utc" }).toFormat("HH:mm:ss");
  if (start <= end) {
    return nowHHMMSS >= start && nowHHMMSS <= end;
  }
  // franja que cruza medianoche, ej. 22:00 - 02:00
  return nowHHMMSS >= start || nowHHMMSS <= end;
}

/**
 * Resuelve la Schedule/Playlist activa para una pantalla en el momento actual,
 * evaluado en la timezone del Location al que pertenece.
 * Entre Schedules que solapan, gana la de mayor `priority`.
 */
export async function resolveActiveSchedule(screenId: string) {
  const screen = await prisma.screen.findUniqueOrThrow({
    where: { id: screenId },
    include: { location: true },
  });

  const nowLocal = DateTime.now().setZone(screen.location.timeZone);
  const dayBit = DAY_BIT_BY_LUXON_WEEKDAY[nowLocal.weekday];
  const todayDate = nowLocal.startOf("day").toJSDate();
  const nowHHMMSS = nowLocal.toFormat("HH:mm:ss");

  const targetConditions: Array<Record<string, string>> = [
    { screenId: screen.id },
    { locationId: screen.locationId },
  ];
  if (screen.screenGroupId) {
    targetConditions.push({ screenGroupId: screen.screenGroupId });
  }

  const candidates = await prisma.schedule.findMany({
    where: {
      AND: [
        { OR: targetConditions },
        { startDate: { lte: todayDate } },
        { OR: [{ endDate: null }, { endDate: { gte: todayDate } }] },
      ],
    },
    include: {
      playlist: {
        include: { items: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: { priority: "desc" },
  });

  const active = candidates.find(
    (s) => (s.daysOfWeek & dayBit) !== 0 && isWithinTime(s.startTime, s.endTime, nowHHMMSS),
  );

  return { screen, activeSchedule: active ?? null };
}
