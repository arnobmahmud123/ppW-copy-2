"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { AppSession } from "@/lib/app-session";
import type { getMessageThreadWorkspace, getMessagingInboxWorkspace } from "@/modules/messaging";
import { MessageNavToggle } from "@/modules/messaging/ui/message-nav-toggle";

type InboxWorkspace = Awaited<ReturnType<typeof getMessagingInboxWorkspace>>;
type ThreadWorkspace = Awaited<ReturnType<typeof getMessageThreadWorkspace>>;

type MessageDashboardFrameProps = {
  session: AppSession;
  workspace: InboxWorkspace;
  selectedThreadId: string | null;
  selectedThread: ThreadWorkspace | null;
  activeTab: "conversation" | "profile" | "history";
  initialConversationMode?: "conversation" | "ai";
  notice?: string;
};

const STORAGE_KEY = "messages:top-nav-visible";
const VISIBILITY_EVENT = "messages-nav-visibility";

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

export function MessageDashboardFrame(props: MessageDashboardFrameProps) {
  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setNavVisible(saved !== "false");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(navVisible));
      window.dispatchEvent(new CustomEvent(VISIBILITY_EVENT, { detail: navVisible }));
    } catch {}
  }, [navVisible]);

  const toggleNav = () => {
    setNavVisible((current) => !current);
  };

  return (
    <>
      <MessageNavToggle navVisible={navVisible} onToggle={toggleNav} />
      <MessageSupportCenter
        {...props}
        viewportClassName={navVisible ? "top-[78px]" : "top-0"}
      />
    </>
  );
}
