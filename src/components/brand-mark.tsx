import Image from "next/image";
import { COLLEGE_NAME, COLLEGE_TAGLINE } from "@/lib/brand";

export function BrandMark({
  compact,
  light,
  size = "sm",
}: {
  compact?: boolean;
  light?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? 72 : size === "md" ? 52 : 36;
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "min-w-0"}`}>
      <span
        className={`relative shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5 ${
          light ? "" : ""
        }`}
        style={{ width: px, height: px }}
      >
        <Image src="/images/brand/gppc-logo.png" alt="" width={px} height={px} className="size-full object-cover" priority={size !== "sm"} />
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-bold leading-tight ${size === "lg" ? "text-lg" : "text-sm"} ${light ? "text-white" : "text-primary"}`}>
          {COLLEGE_NAME}
        </span>
        <span className={`block truncate text-[10px] font-medium tracking-[0.16em] uppercase ${light ? "text-secondary" : "text-muted-foreground"}`}>
          {COLLEGE_TAGLINE}
        </span>
      </span>
    </div>
  );
}
