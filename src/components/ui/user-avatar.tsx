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
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Reset states if avatarUrl changes, and check immediately if cached failure
  React.useEffect(() => {
    setImgError(false);
    setIsLoaded(false);

    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth === 0) {
        setImgError(true);
      } else {
        setIsLoaded(true);
      }
    }
  }, [avatarUrl]);

  const safeName = name || "Unknown User";
  const initials = safeName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = stringToColor(safeName);

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      title={safeName}
    >
      {/* Fallback initials — only shown when no avatar URL or image failed to load */}
      {(!avatarUrl || imgError) && (
        <span>{initials}</span>
      )}

      {/* Actual Avatar Image */}
      {avatarUrl && !imgError && (
        <img
          ref={imgRef}
          src={avatarUrl}
          alt={safeName}
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setImgError(true);
            setIsLoaded(false);
          }}
        />
      )}
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#14B8A6", // teal
    "#F97316", // orange
  ];

  return colors[Math.abs(hash) % colors.length];
}
