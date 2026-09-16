import type { Staff, TimetableSlot } from "./types";

const PERIOD_FALLBACK: Record<string, { start: string; end: string }> = {
  "9:00 AM": { start: "09:00", end: "10:00" },
  "10:00 AM": { start: "10:00", end: "11:00" },
  "11:15 AM": { start: "11:15", end: "12:15" },
  "12:15 PM": { start: "12:15", end: "13:15" },
  "2:00 PM": { start: "14:00", end: "15:00" },
  "3:00 PM": { start: "15:00", end: "16:00" },
};

export function toMinutes(value: string) {
  const hhmm = toHHmm(value);
  if (!hhmm) return NaN;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHmm(value: string) {
  const raw = value.trim();
  const mapped = PERIOD_FALLBACK[raw];
  if (mapped) return mapped.start;
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const min = Number(ampm[2]);
    const mer = ampm[3].toUpperCase();
    if (mer === "PM" && hour < 12) hour += 12;
    if (mer === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFour) return "";
  return `${String(Number(twentyFour[1])).padStart(2, "0")}:${twentyFour[2]}`;
}

export function addMinutes(hhmm: string, minutes: number) {
  const total = toMinutes(hhmm) + minutes;
  if (Number.isNaN(total)) return "";
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatClock(hhmm: string) {
  const mins = toMinutes(hhmm);
  if (Number.isNaN(mins)) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const mer = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${mer}`;
}

export function slotTimes(slot: Pick<TimetableSlot, "period" | "startTime" | "endTime">) {
  const startRaw = (slot.startTime ?? "").trim();
  const endRaw = (slot.endTime ?? "").trim();
  if (startRaw && endRaw) {
    return { start: toHHmm(startRaw), end: toHHmm(endRaw) };
  }
  const fallback = PERIOD_FALLBACK[slot.period] ?? { start: toHHmm(slot.period), end: addMinutes(toHHmm(slot.period), 60) };
  const start = startRaw ? toHHmm(startRaw) : fallback.start;
  const end = endRaw ? toHHmm(endRaw) : fallback.end || addMinutes(start, 60);
  return { start, end };
}

/** Canonical timetable times. `period` is always derived and never kept as a second source of truth. */
export function normalizeTimetableSlot(slot: TimetableSlot): TimetableSlot {
  const times = slotTimes(slot);
  const start = times.start || "09:00";
  const end = times.end || addMinutes(start, 60);
  return {
    ...slot,
    id: slot.id,
    startTime: start,
    endTime: end,
    period: periodLabel(start, end),
    courseId: slot.courseId,
  };
}

export function subjectIdOf(slot: Pick<TimetableSlot, "courseId">) {
  return slot.courseId;
}

export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 18 * 60;

export function timeAxis(stepMin = 60) {
  const rows: { start: string; end: string; label: string; minutes: number }[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += stepMin) {
    const start = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const end = addMinutes(start, stepMin);
    rows.push({ start, end, label: formatClock(start), minutes: m });
  }
  return rows;
}

export function periodLabel(start: string, end: string) {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const a0 = toMinutes(aStart);
  const a1 = toMinutes(aEnd);
  const b0 = toMinutes(bStart);
  const b1 = toMinutes(bEnd);
  if ([a0, a1, b0, b1].some((n) => Number.isNaN(n))) return false;
  return a0 < b1 && b0 < a1;
}

export function validateSlotTimes(startTime: string, endTime: string) {
  if (!toHHmm(startTime) || !toHHmm(endTime)) return "Start and end times are required.";
  if (toMinutes(startTime) >= toMinutes(endTime)) return "End time must be later than start time.";
  return null;
}

export type TimetableConflict = {
  kind: "staff" | "room" | "section";
  message: string;
  other: TimetableSlot;
};

export function findTimetableConflicts(
  candidate: TimetableSlot,
  slots: TimetableSlot[],
  staff: Staff[],
): TimetableConflict[] {
  const timeError = validateSlotTimes(slotTimes(candidate).start, slotTimes(candidate).end);
  if (timeError) return [];
  const a = slotTimes(candidate);
  const conflicts: TimetableConflict[] = [];
  for (const other of slots) {
    if (other.id === candidate.id) continue;
    if (other.day !== candidate.day) continue;
    const b = slotTimes(other);
    if (!timesOverlap(a.start, a.end, b.start, b.end)) continue;
    const window = `${formatClock(b.start)} – ${formatClock(b.end)} on ${other.day}`;
    if (candidate.staffId && other.staffId === candidate.staffId) {
      const name = staff.find((t) => t.id === candidate.staffId)?.name ?? "This staff member";
      conflicts.push({
        kind: "staff",
        other,
        message: `${name} is already assigned to another class from ${window}.`,
      });
    }
    if (candidate.room.trim() && other.room.trim() && other.room.trim().toLowerCase() === candidate.room.trim().toLowerCase()) {
      conflicts.push({
        kind: "room",
        other,
        message: `${candidate.room} is already occupied from ${window}.`,
      });
    }
    if (candidate.sectionId && other.sectionId === candidate.sectionId) {
      conflicts.push({
        kind: "section",
        other,
        message: `This section already has a class from ${window}.`,
      });
    }
  }
  return conflicts;
}
