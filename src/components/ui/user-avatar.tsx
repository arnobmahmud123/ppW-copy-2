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
  const normalizedAvatarUrl = React.useMemo(() => normalizeAvatarUrl(avatarUrl), [avatarUrl]);

  const safeName = name || "Unknown User";
  const initials = safeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = stringToColor(safeName);
  const fallbackAvatarUrl = React.useMemo(
    () => createFallbackAvatarDataUri(initials, safeName, bgColor),
    [bgColor, initials, safeName],
  );
  const resolvedAvatarUrl = !imgError && normalizedAvatarUrl ? normalizedAvatarUrl : fallbackAvatarUrl;

  React.useEffect(() => {
    setImgError(false);

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setImgError(true);
    }
  }, [normalizedAvatarUrl]);

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
      <img
        ref={imgRef}
        src={resolvedAvatarUrl}
        alt={safeName}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={() => {
          if (resolvedAvatarUrl !== fallbackAvatarUrl) {
            setImgError(true);
          }
        }}
      />
    </div>
  );
}

function normalizeAvatarUrl(avatarUrl?: string | null) {
  if (typeof avatarUrl !== "string") {
    return null;
  }

  const trimmed = avatarUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (isGeneratedAvatarProviderUrl(trimmed)) {
    return null;
  }

  if (/^(https?:|data:|blob:|\/)/i.test(trimmed)) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\.?\/*/, "")}`;
}

function createFallbackAvatarDataUri(initials: string, name: string, bgColor: string) {
  const safeInitials = initials || "U";
  const accentColor = stringToAccentColor(name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${escapeSvgText(name)}">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColor}" />
          <stop offset="100%" stop-color="${accentColor}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#avatarGradient)" />
      <circle cx="72" cy="24" r="12" fill="rgba(255,255,255,0.18)" />
      <text x="48" y="55" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#ffffff">${escapeSvgText(safeInitials)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function stringToAccentColor(str: string): string {
  const accents = [
    "#60A5FA",
    "#34D399",
    "#FBBF24",
    "#FB7185",
    "#A78BFA",
    "#F472B6",
    "#22D3EE",
    "#FB923C",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 6) - hash);
  }

  return accents[Math.abs(hash) % accents.length];
}

function isGeneratedAvatarProviderUrl(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === "via.placeholder.com" || host === "ui-avatars.com";
  } catch {
    return false;
  }
}
