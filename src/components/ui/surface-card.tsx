import React from "react";
import { cn } from "@/lib/utils";

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function SurfaceCard({ className, children, ...props }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(188,198,228,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] p-6 text-slate-800 shadow-[0_18px_44px_rgba(145,160,204,0.14)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
