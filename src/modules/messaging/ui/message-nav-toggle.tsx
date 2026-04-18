"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

type MessageNavToggleProps = {
  navVisible: boolean;
  onToggle: () => void;
};

export function MessageNavToggle({ navVisible, onToggle }: MessageNavToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "fixed left-[42px] z-[85] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-2xl border border-[rgba(224,211,255,0.92)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(246,241,255,0.98)_50%,rgba(239,245,255,0.98)_100%)] text-[#7280ad] shadow-[0_10px_24px_rgba(169,157,229,0.18)] transition hover:text-[#7c3aed]",
        navVisible ? "top-[74px]" : "top-3"
      )}
      title={navVisible ? "Hide top navigation" : "Show top navigation"}
      aria-label={navVisible ? "Hide top navigation" : "Show top navigation"}
    >
      {navVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}
