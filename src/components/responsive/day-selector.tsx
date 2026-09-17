"use client";

import { Button } from "@/components/ui/button";
import { DAYS } from "@/lib/types";

export function DaySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (day: string) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Weekdays"
    >
      {DAYS.map((day) => (
        <Button
          key={day}
          type="button"
          size="sm"
          role="tab"
          aria-selected={day === value}
          variant={day === value ? "secondary" : "outline"}
          className="min-h-11 min-w-12 shrink-0 rounded-full px-3"
          onClick={() => onChange(day)}
        >
          {day.slice(0, 3)}
        </Button>
      ))}
    </div>
  );
}
