import { DateTime } from "luxon";
import { prisma } from "../config/prisma.js";

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

interface TimeContext {
  dayBit: number;
  todayDate: Date;
  nowHHMMSS: string;
}

function isWithinTime(startTime: Date, endTime: Date, nowHHMMSS: string): boolean {
  const start = DateTime.fromJSDate(startTime, { zone: "utc" }).toFormat("HH:mm:ss");
  const end = DateTime.fromJSDate(endTime, { zone: "utc" }).toFormat("HH:mm:ss");
  if (start <= end) {
    return nowHHMMSS >= start && nowHHMMSS <= end;
  }
  // franja que cruza medianoche, ej. 22:00 - 02:00
  return nowHHMMSS >= start || nowHHMMSS <= end;
}

function computeTimeContext(timeZone: string): TimeContext {
  const nowLocal = DateTime.now().setZone(timeZone);
  // StartDate/EndDate son columnas DATE (sin hora ni zona): se guardan como
  // medianoche UTC del día de calendario elegido (ver zod z.coerce.date() en
  // schedules.controller.ts). Comparar contra el instante de "medianoche en la
  // timezone del restaurante" desplaza la fecha en zonas con offset positivo
  // (ej. Europe/Madrid, UTC+2 en verano: medianoche local = 22:00 UTC del día
  // anterior), por lo que hay que anclar "hoy" a medianoche UTC del mismo
  // día-de-calendario local, no al instante de esa medianoche local.
  const todayDate = DateTime.fromObject(
    { year: nowLocal.year, month: nowLocal.month, day: nowLocal.day },
    { zone: "utc" },
  ).toJSDate();
  return {
    dayBit: DAY_BIT_BY_LUXON_WEEKDAY[nowLocal.weekday],
    todayDate,
    nowHHMMSS: nowLocal.toFormat("HH:mm:ss"),
  };
}

async function findActiveSchedule(targetConditions: Array<Record<string, string>>, time: TimeContext) {
  const candidates = await prisma.schedule.findMany({
    where: {
      AND: [
        { OR: targetConditions },
        { startDate: { lte: time.todayDate } },
        { OR: [{ endDate: null }, { endDate: { gte: time.todayDate } }] },
      ],
    },
    include: {
      playlist: {
        include: { items: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: { priority: "desc" },
  });

  return candidates.find((s) => (s.daysOfWeek & time.dayBit) !== 0 && isWithinTime(s.startTime, s.endTime, time.nowHHMMSS)) ?? null;
}

export type ActiveScheduleResult = Awaited<ReturnType<typeof findActiveSchedule>>;

/**
 * Resuelve qué se debe mostrar en una pantalla ahora mismo, evaluado en la
 * timezone de su Location. Entre Schedules que solapan para un mismo target,
 * gana la de mayor `priority`.
 *
 * Si la pantalla tiene zonas (layout dividido en regiones), resuelve una
 * Schedule por zona de forma independiente. Si no tiene zonas, resuelve una
 * única Schedule a pantalla completa (comportamiento original, sin cambios).
 */
export async function resolveActiveSchedule(screenId: string) {
  const screen = await prisma.screen.findUniqueOrThrow({
    where: { id: screenId },
    include: { location: true, zones: { orderBy: { zIndex: "asc" } } },
  });

  const time = computeTimeContext(screen.location.timeZone);

  if (screen.zones.length > 0) {
    const zones = await Promise.all(
      screen.zones.map(async (zone) => ({
        zone,
        activeSchedule: await findActiveSchedule([{ screenZoneId: zone.id }], time),
      })),
    );
    return { screen, layout: "zones" as const, zones };
  }

  const targetConditions: Array<Record<string, string>> = [
    { screenId: screen.id },
    { locationId: screen.locationId },
  ];
  if (screen.screenGroupId) {
    targetConditions.push({ screenGroupId: screen.screenGroupId });
  }

  const activeSchedule = await findActiveSchedule(targetConditions, time);
  return { screen, layout: "single" as const, activeSchedule };
}
