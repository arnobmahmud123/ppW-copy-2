"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const normalizedAvatarUrl = React.useMemo(() => {
    if (typeof avatarUrl !== "string") {
      return null;
    }

    const trimmed = avatarUrl.trim();
    if (!trimmed) {
      return null;
    }

    if (/^(https?:|data:|blob:|\/)/i.test(trimmed)) {
      return trimmed;
    }

    return `/${trimmed.replace(/^\.?\/*/, "")}`;
  }, [avatarUrl]);

  React.useEffect(() => {
    setImgError(false);

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setImgError(true);
    }
  }, [normalizedAvatarUrl]);

  const safeName = name || "Unknown User";
  const initials = safeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = stringToColor(safeName);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: bgColor }}
      title={safeName}
    >
      {(!normalizedAvatarUrl || imgError) && <span>{initials}</span>}

      {normalizedAvatarUrl && !imgError ? (
        <img
          ref={imgRef}
          src={normalizedAvatarUrl}
          alt={safeName}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : null}
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];

  return colors[Math.abs(hash) % colors.length];
}
