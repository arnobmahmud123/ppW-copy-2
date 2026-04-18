"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import DashboardNav from "@/components/DashboardNav";
import type { AppSession } from "@/lib/app-session";
import type { getMessageThreadWorkspace, getMessagingInboxWorkspace } from "@/modules/messaging";
import { MessageNavToggle } from "@/modules/messaging/ui/message-nav-toggle";

type InboxWorkspace = Awaited<ReturnType<typeof getMessagingInboxWorkspace>>;
type ThreadWorkspace = Awaited<ReturnType<typeof getMessageThreadWorkspace>>;

const MessageSupportCenter = dynamic(
  () =>
    import("@/modules/messaging/ui/message-support-center").then(
      (mod) => mod.MessageSupportCenter,
    ),
  {
    ssr: false,
    loading: () => (
      <main className="fixed inset-x-0 bottom-0 top-[78px] flex items-center justify-center bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] text-sm font-medium text-slate-500">
        Loading messages...
      </main>
    ),
  },
);

type MessagePageFrameProps = {
  session: AppSession;
  workspace: InboxWorkspace;
  selectedThreadId: string | null;
  selectedThread: ThreadWorkspace | null;
  activeTab: "conversation" | "profile" | "history";
  initialConversationMode?: "conversation" | "ai";
  notice?: string;
};

export function MessagePageFrame(props: MessagePageFrameProps) {
  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("messages:top-nav-visible");
      if (saved !== null) {
        setNavVisible(saved !== "false");
      }
    } catch {}
  }, []);

  const toggleNav = () => {
    setNavVisible((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("messages:top-nav-visible", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      {navVisible ? <DashboardNav /> : null}
      <MessageNavToggle navVisible={navVisible} onToggle={toggleNav} />

      <MessageSupportCenter
        {...props}
        viewportClassName={navVisible ? "top-[78px]" : "top-0"}
      />
    </div>
  );
}
