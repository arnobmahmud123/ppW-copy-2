"use client";

import React, { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

export interface HoverCardUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  roleName?: string | null;
  email?: string | null;
  isOnline?: boolean;
}

interface UserHoverCardProps {
  user: HoverCardUser;
  /** The id of the currently-logged-in user — hides "Message" button for self */
  currentUserId?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any element. On hover, shows a Google-Chat-style pop-up card
 * with the user's avatar, name, role and quick action buttons.
 */
export function UserHoverCard({
  user,
  currentUserId,
  children,
  className,
}: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => setOpen(true), 280);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const handleMessage = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages/dm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.threadId) {
        router.push(`/messages?thread=${data.threadId}`);
        setOpen(false);
      } else {
        console.error("DM error:", data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id, loading, router]);

  const isSelf = currentUserId && currentUserId === user.id;

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Hover card popup */}
      {open && (
        <div
          className={cn(
            "absolute z-[200] w-72 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-4",
            "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150",
            // Position above or below depending on space — default below-right
            "left-0 top-full mt-2"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Profile bar */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <Link href={`/users/${user.id}`} className="block">
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
              </Link>
              {user.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/users/${user.id}`} className="block truncate text-sm font-bold text-slate-900 transition hover:text-violet-700">
                {user.name}
              </Link>
              {user.roleName && (
                <p className="truncate text-xs text-slate-500 mt-0.5">{user.roleName}</p>
              )}
              {user.email && (
                <p className="truncate text-[11px] text-slate-400 mt-0.5">{user.email}</p>
              )}
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    user.isOnline ? "bg-emerald-500" : "bg-slate-300"
                  )}
                />
                <span className={cn("text-[11px] font-medium", user.isOnline ? "text-emerald-600" : "text-slate-400")}>
                  {user.isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isSelf && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleMessage}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Message
              </button>
            </div>
          )}

          {isSelf && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              This is you
            </div>
          )}
        </div>
      )}
    </div>
  );
}
