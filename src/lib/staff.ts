import type { Staff, StaffType } from "./types";

export const STAFF_TYPES: { id: StaffType; label: string }[] = [
  { id: "teaching", label: "Teaching" },
  { id: "non-teaching", label: "Non-Teaching" },
  { id: "administrative", label: "Administrative" },
  { id: "support", label: "Support" },
];

export function staffTypeOf(row: Staff): StaffType {
  return row.staffType ?? (row.courseIds.length > 0 ? "teaching" : "non-teaching");
}

export function staffTypeLabel(type: StaffType) {
  return STAFF_TYPES.find((t) => t.id === type)?.label ?? type;
}
