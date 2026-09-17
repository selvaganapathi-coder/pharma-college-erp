"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      visibleToasts={4}
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" aria-hidden />,
        info: <InfoIcon className="size-4" aria-hidden />,
        warning: <TriangleAlertIcon className="size-4" aria-hidden />,
        error: <OctagonXIcon className="size-4" aria-hidden />,
        loading: <Loader2Icon className="size-4 animate-spin" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast min-w-0 max-w-full rounded-2xl p-4 shadow-lg sm:min-w-[280px]",
          title: "font-bold tracking-wide",
          description: "opacity-95",
        },
      }}
      {...props}
    />
  );
}
