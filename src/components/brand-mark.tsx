export function BrandMark({
  compact,
  light,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "min-w-0"}`}>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          light ? "bg-secondary text-sidebar" : "bg-primary text-secondary"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-5 fill-current">
          <path d="M12 2c1.4 3.2.6 5.4-1.2 7.2C8.8 11.2 8 13 8.6 15.2 9.4 18 12 20 12 20s2.6-2 3.4-4.8c.6-2.2-.2-4-2.2-6C11.4 7.4 10.6 5.2 12 2Z" />
          <path d="M9 20.2c.8.5 1.8.8 3 .8s2.2-.3 3-.8c-1 .9-2 1.4-3 1.4s-2-.5-3-1.4Z" opacity=".7" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-sm font-bold leading-tight ${light ? "text-white" : "text-primary"}`}>
          GP Pharmacy College
        </span>
        <span className={`block truncate text-[10px] font-medium tracking-[0.16em] uppercase ${light ? "text-secondary" : "text-muted-foreground"}`}>
          Learn • Practice • Lead
        </span>
      </span>
    </div>
  );
}
