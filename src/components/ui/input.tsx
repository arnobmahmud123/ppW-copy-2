"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[rgba(188,198,228,0.84)] bg-[rgba(255,255,255,0.96)] px-3 py-2 text-sm text-slate-900 placeholder:text-[#8b97bb] outline-none transition focus:border-[#a56cff] focus:ring-2 focus:ring-[rgba(165,108,255,0.16)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
