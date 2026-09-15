"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function PhotoUpload({
  label,
  value,
  onChange,
  onFile,
}: {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  onFile: (file: File) => Promise<string>;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-[#C41E3A]">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border-2 border-[#C41E3A] bg-[#FFF3C4] text-xs text-[#C41E3A]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            "No photo"
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setErr(null);
              try {
                const url = await onFile(file);
                onChange(url);
              } catch (error) {
                setErr(error instanceof Error ? error.message : "Upload failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
          {value ? (
            <Button type="button" variant="ghost" size="sm" className="mt-1 text-[#C41E3A]" onClick={() => onChange("")}>
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-[#C41E3A]">{busy ? "Uploading…" : err ?? "JPG, PNG or WebP. Max 4 MB."}</p>
    </div>
  );
}
