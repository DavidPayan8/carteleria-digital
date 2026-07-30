import { DAY_BITS } from "../../core/models/models";
import { Schedule } from "../../core/models/models";

const PALETTE = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

export interface CalendarBlock {
  key: string;
  schedule: Schedule;
  dayIndex: number; // 0=Lun ... 6=Dom
  startMinutes: number;
  endMinutes: number;
  color: string;
  isWinner: boolean;
  tied: boolean;
}

function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// startDate/endDate son columnas DATE puras (ver comentario en scheduleResolver.ts): la parte de
// fecha del ISO representa el día de calendario elegido, sin depender de zona horaria. Se compara
// como texto YYYY-MM-DD contra la fecha de calendario de cada columna de la semana visualizada.
function isValidOnDate(schedule: Schedule, date: Date): boolean {
  const key = toDateKey(date);
  if (key < schedule.startDate.slice(0, 10)) return false;
  if (schedule.endDate && key > schedule.endDate.slice(0, 10)) return false;
  return true;
}

// Construye los bloques visuales de una semana concreta (weekDates[0..6] = fechas reales de
// Lun a Dom) para un conjunto de schedules que ya comparten "target" (misma pantalla/zona/grupo/
// restaurante) — es decir, que realmente compiten entre sí según scheduleResolver.ts. Cada
// schedule solo genera bloque en los días cuyo bit de daysOfWeek está activo Y cuya fecha real
// cae dentro de [startDate, endDate]: dos programaciones con horarios solapados pero vigencias
// que nunca coinciden en el calendario no se muestran como conflicto. Dentro de un mismo día, si
// dos bloques se solapan en horario, gana el de mayor `priority`; en empate exacto, se usa el id
// como desempate estable solo para que la UI no marque a ambos como "perdedores" (el backend no
// garantiza ese orden).
export function buildCalendarBlocks(schedules: Schedule[], weekDates: Date[]): CalendarBlock[][] {
  const raw: Omit<CalendarBlock, "color" | "isWinner" | "tied" | "key">[] = [];

  schedules.forEach((schedule) => {
    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    DAY_BITS.forEach((bit, dayIndex) => {
      if ((schedule.daysOfWeek & bit) === 0) return;
      if (!isValidOnDate(schedule, weekDates[dayIndex])) return;
      if (start <= end) {
        raw.push({ schedule, dayIndex, startMinutes: start, endMinutes: end });
      } else {
        // Cruza medianoche: se divide en el tramo de esta noche y el de la madrugada siguiente.
        raw.push({ schedule, dayIndex, startMinutes: start, endMinutes: 24 * 60 });
        const nextIndex = (dayIndex + 1) % 7;
        if (isValidOnDate(schedule, weekDates[nextIndex])) {
          raw.push({ schedule, dayIndex: nextIndex, startMinutes: 0, endMinutes: end });
        }
      }
    });
  });

  const colorByScheduleId = new Map<string, string>();
  let nextColor = 0;
  const colorFor = (id: string) => {
    if (!colorByScheduleId.has(id)) {
      colorByScheduleId.set(id, PALETTE[nextColor % PALETTE.length]);
      nextColor++;
    }
    return colorByScheduleId.get(id)!;
  };

  const blocks: CalendarBlock[] = raw.map((block, i) => {
    const overlapping = raw.filter(
      (other) =>
        other !== block &&
        other.dayIndex === block.dayIndex &&
        other.startMinutes < block.endMinutes &&
        other.endMinutes > block.startMinutes,
    );
    const beatenBy = overlapping.filter(
      (other) =>
        other.schedule.priority > block.schedule.priority ||
        (other.schedule.priority === block.schedule.priority && other.schedule.id < block.schedule.id),
    );
    const tied = overlapping.some((other) => other.schedule.priority === block.schedule.priority);
    return {
      key: `${block.schedule.id}-${block.dayIndex}-${block.startMinutes}-${i}`,
      schedule: block.schedule,
      dayIndex: block.dayIndex,
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      color: colorFor(block.schedule.id),
      isWinner: beatenBy.length === 0,
      tied,
    };
  });

  const byDay: CalendarBlock[][] = [[], [], [], [], [], [], []];
  blocks.forEach((b) => byDay[b.dayIndex].push(b));
  return byDay;
}

export function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function buildWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}
