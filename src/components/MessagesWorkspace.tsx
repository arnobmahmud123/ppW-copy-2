"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import {
  FileText,
  Hash,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react"

type MessageItem = {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    role: string
  }
  workOrder: {
    id: string
    title: string
  }
  isRead?: boolean
  readAt?: string | null
}

type WorkOrderItem = {
  id: string
  title: string
  status: string
  workOrderNumber?: string
  client?: { name?: string }
  assignedContractor?: { name?: string }
  assignedCoordinator?: { name?: string }
  assignedProcessor?: { name?: string }
  _count?: {
    messages?: number
  }
}

type Props = {
  roleLabel: string
  accentClass: string
}

export default function MessagesWorkspace({ roleLabel, accentClass }: Props) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([])
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("")
  const threadViewportRef = useRef<HTMLDivElement | null>(null)
  const composerShellRef = useRef<HTMLDivElement | null>(null)
  const activeMarkingRef = useRef<string>("")
  const [composerReserveHeight, setComposerReserveHeight] = useState(184)

  useEffect(() => {
    void syncWorkspace({ initial: true })
  }, [])

  useEffect(() => {
    const preselectedWorkOrderId = searchParams.get("workOrderId")
    if (preselectedWorkOrderId) {
      setSelectedWorkOrderId(preselectedWorkOrderId)
    }
  }, [searchParams])

  const fetchMessages = async () => {
    const response = await fetch("/api/messages")
    if (!response.ok) {
      return
    }
    const data = await response.json()
    setMessages(data.messages || [])
    setLastSyncedAt(new Date().toISOString())
  }

  const fetchWorkOrders = async () => {
    const response = await fetch("/api/work-orders")
    if (!response.ok) {
      return
    }
    const data = await response.json()
    const nextWorkOrders = Array.isArray(data.workOrders) ? data.workOrders : []
    setWorkOrders(nextWorkOrders)
    setSelectedWorkOrderId((prev) => prev || nextWorkOrders[0]?.id || "")
  }

  const syncWorkspace = async ({ initial = false, silent = false } = {}) => {
    if (!initial && !silent) {
      setRefreshing(true)
    }

    try {
      await Promise.all([fetchMessages(), fetchWorkOrders()])
    } finally {
      if (initial) {
        setLoading(false)
      }
      if (!silent) {
        setRefreshing(false)
      }
    }
  }

  const conversations = useMemo(() => {
    const grouped = new Map<string, { workOrder: WorkOrderItem; lastMessage?: MessageItem; unreadCount: number }>()

    workOrders.forEach((workOrder) => {
      grouped.set(workOrder.id, {
        workOrder,
        unreadCount: 0,
      })
    })

    messages.forEach((message) => {
      const existing = grouped.get(message.workOrder.id)
      if (existing) {
        if (!existing.lastMessage || new Date(message.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = message
        }
        if (message.author.id !== session?.user.id && !message.isRead) {
          existing.unreadCount += 1
        }
      } else {
        grouped.set(message.workOrder.id, {
          workOrder: {
            id: message.workOrder.id,
            title: message.workOrder.title,
            status: "",
          },
          lastMessage: message,
          unreadCount: message.author.id !== session?.user.id && !message.isRead ? 1 : 0,
        })
      }
    })

    return [...grouped.values()]
      .filter((conversation) => {
        if (!searchTerm.trim()) {
          return true
        }
        const haystack = [
          conversation.workOrder.title,
          conversation.workOrder.workOrderNumber,
          conversation.lastMessage?.content,
          conversation.lastMessage?.author?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(searchTerm.toLowerCase())
      })
      .sort((a, b) => {
        const aDate = a.lastMessage?.createdAt || ""
        const bDate = b.lastMessage?.createdAt || ""
        return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime()
      })
  }, [messages, searchTerm, session?.user.id, workOrders])

  const activeConversation = conversations.find((item) => item.workOrder.id === selectedWorkOrderId) || conversations[0]

  const threadMessages = useMemo(
    () =>
      messages
        .filter((message) => message.workOrder.id === activeConversation?.workOrder.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activeConversation?.workOrder.id, messages]
  )

  useEffect(() => {
    if (!selectedWorkOrderId && conversations[0]?.workOrder.id) {
      setSelectedWorkOrderId(conversations[0].workOrder.id)
    }
  }, [conversations, selectedWorkOrderId])

  const markThreadRead = async (workOrderId: string) => {
    if (!workOrderId || activeMarkingRef.current === workOrderId) {
      return
    }

    const hasUnread = messages.some(
      (message) =>
        message.workOrder.id === workOrderId &&
        message.author.id !== session?.user.id &&
        !message.isRead
    )

    if (!hasUnread) {
      return
    }

    activeMarkingRef.current = workOrderId

    setMessages((prev) =>
      prev.map((message) =>
        message.workOrder.id === workOrderId && message.author.id !== session?.user.id
          ? {
              ...message,
              isRead: true,
              readAt: message.readAt || new Date().toISOString(),
            }
          : message
      )
    )

    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workOrderId }),
      })
    } catch (error) {
      console.error("Mark thread read error:", error)
    } finally {
      activeMarkingRef.current = ""
      void syncWorkspace({ silent: true })
    }
  }

  useEffect(() => {
    if (loading) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncWorkspace({ silent: true })
      }
    }, 4000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncWorkspace({ silent: true })
      }
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [loading])

  useEffect(() => {
    const viewport = threadViewportRef.current
    if (!viewport) {
      return
    }
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    })
  }, [selectedWorkOrderId, threadMessages])

  useEffect(() => {
    if (activeConversation?.workOrder.id) {
      void markThreadRead(activeConversation.workOrder.id)
    }
  }, [activeConversation?.workOrder.id])

  useEffect(() => {
    const composerShell = composerShellRef.current
    if (!composerShell) {
      return
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(composerShell.getBoundingClientRect().height) + 24
      setComposerReserveHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateHeight()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(composerShell)
    return () => observer.disconnect()
  }, [activeConversation?.workOrder.id])

  const sendMessage = async () => {
    if (!draft.trim() || !activeConversation?.workOrder.id) {
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workOrderId: activeConversation.workOrder.id,
          content: draft.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()
      if (data?.data) {
        setMessages((prev) => {
          const next = [...prev.filter((item) => item.id !== data.data.id), data.data]
          return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        })
        setWorkOrders((prev) =>
          prev.map((workOrder) =>
            workOrder.id === activeConversation.workOrder.id
              ? {
                  ...workOrder,
                  _count: {
                    ...workOrder._count,
                    messages: (workOrder._count?.messages || 0) + 1,
                  },
                }
              : workOrder
          )
        )
      }
      setDraft("")
      await syncWorkspace({ silent: true })
    } catch (error) {
      console.error("Send message error:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const getCounterparty = (workOrder: WorkOrderItem) => {
    const participants = [
      workOrder.client?.name,
      workOrder.assignedContractor?.name,
      workOrder.assignedCoordinator?.name,
      workOrder.assignedProcessor?.name,
    ].filter(Boolean)
    return participants.join(" • ")
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-11rem)] overflow-hidden rounded-[30px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_52%,#eef4ff_100%)] shadow-[0_24px_80px_rgba(196,186,255,0.18)]">
      <div className="grid min-h-[calc(100vh-11rem)] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="border-r border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_100%)] px-4 py-5 text-[#435072]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-[#a356dc]">Messages</div>
              <h2 className="mt-2 text-2xl font-semibold">Team Channel</h2>
              <p className="mt-1 text-sm text-[#7280ad]">{roleLabel}</p>
            </div>
            <div className="rounded-2xl border border-[#e1d8ff] bg-[linear-gradient(135deg,#fff4fc_0%,#eef4ff_100%)] px-3 py-2 text-xs font-semibold text-[#5b6994]">
              {conversations.length} threads
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a96bb]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search work orders or messages"
              className="w-full rounded-2xl border border-[#e2dbff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] py-2.5 pl-10 pr-4 text-sm text-[#2b3159] outline-none placeholder:text-[#8a96bb]"
            />
          </div>

          <div className="space-y-2 overflow-y-auto pr-1">
            {conversations.map((conversation) => {
              const isActive = conversation.workOrder.id === activeConversation?.workOrder.id
              return (
                <button
                  key={conversation.workOrder.id}
                  onClick={() => setSelectedWorkOrderId(conversation.workOrder.id)}
                  className={`w-full rounded-[26px] border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-[#d8b9ff] bg-[linear-gradient(135deg,#fff0fb_0%,#eef4ff_100%)] shadow-[0_12px_30px_rgba(196,186,255,0.2)]"
                      : "border-[#ebe5ff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] hover:border-[#ddd2ff] hover:bg-[#fcf8ff]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#2b3159]">
                        <Hash className="h-4 w-4 text-[#8a96bb]" />
                        <span className="truncate">{conversation.workOrder.title}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-[#8a96bb]">
                        {conversation.workOrder.workOrderNumber || conversation.workOrder.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.unreadCount > 0 ? (
                        <div className="rounded-full bg-[linear-gradient(135deg,#fff2fb_0%,#f0eaff_100%)] px-2 py-1 text-[11px] font-semibold text-[#b031da]">
                          {conversation.unreadCount} new
                        </div>
                      ) : null}
                      <div className="rounded-full bg-[linear-gradient(135deg,#f7f3ff_0%,#eef4ff_100%)] px-2 py-1 text-[11px] text-[#5b6994]">
                        {conversation.workOrder._count?.messages || 0}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-[#7280ad]">
                    {getCounterparty(conversation.workOrder) || "Participants will appear here"}
                  </div>
                  <div className="mt-3 line-clamp-2 text-sm text-[#435072]">
                    {conversation.lastMessage?.content || "No messages yet. Start the conversation."}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="relative flex min-h-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f9f5ff_52%,#eef4ff_100%)]">
          {activeConversation ? (
            <>
              <div className="border-b border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_100%)] px-6 py-5 text-[#435072]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[#7280ad]">
                      <span className="h-3 w-3 rounded-full bg-[#8fb0ff]" />
                      Shared work-order chat
                    </div>
                    <h3 className="mt-1 text-2xl font-semibold text-[#2b3159]">
                      {activeConversation.workOrder.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#7280ad]">
                      {activeConversation.workOrder.workOrderNumber || activeConversation.workOrder.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-[#e1d8ff] bg-[linear-gradient(135deg,#fff4fc_0%,#eef4ff_100%)] px-3 py-2 text-xs font-medium text-[#5b6994]">
                      Live updates every 4s
                      {lastSyncedAt ? ` • ${new Date(lastSyncedAt).toLocaleTimeString()}` : ""}
                    </div>
                    <button
                      onClick={() => void syncWorkspace()}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#e1d8ff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5] hover:border-[#d1c8ff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                    <Link
                      href={`/dashboard/${session?.user.role?.toLowerCase()}/work-orders/${activeConversation.workOrder.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#e1d8ff] bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_100%)] px-4 py-2 text-sm font-medium text-[#4f63b5] hover:border-[#d1c8ff]"
                    >
                      <FileText className="h-4 w-4" />
                      Open Work Order
                    </Link>
                  </div>
                </div>
              </div>

              <div
                ref={threadViewportRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-transparent px-6 py-6"
                style={{
                  paddingBottom: `${composerReserveHeight}px`,
                  scrollPaddingBottom: `${composerReserveHeight + 24}px`,
                }}
              >
                {threadMessages.length === 0 ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <div className="max-w-sm rounded-[28px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-8 text-center shadow-sm">
                      <MessageSquare className="mx-auto h-10 w-10 text-[#9aa6cc]" />
                      <h4 className="mt-4 text-lg font-semibold text-[#2b3159]">Start the thread</h4>
                      <p className="mt-2 text-sm text-[#7280ad]">
                        This channel is shared across admin, contractor, coordinator, processor, and client users who can access this work order.
                      </p>
                    </div>
                  </div>
                ) : (
                  threadMessages.map((message) => {
                    const isOwn = message.author.id === session?.user.id
                    return (
                      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-3xl rounded-[24px] px-5 py-4 shadow-sm ${
                            isOwn
                              ? "bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] text-white shadow-[0_12px_24px_rgba(255,107,60,0.28)]"
                              : "border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] text-[#435072] shadow-[0_8px_20px_rgba(196,186,255,0.14)]"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-3 text-xs">
                            <span className={`font-semibold ${isOwn ? "text-white/95" : "text-[#2b3159]"}`}>
                              {message.author.name}
                            </span>
                            <span className={`${isOwn ? "text-white/70" : "text-[#7280ad]"}`}>
                              {message.author.role}
                            </span>
                            <span className={`${isOwn ? "text-white/65" : "text-[#7280ad]"}`}>
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                            {!isOwn ? (
                              <span className={message.isRead ? "text-[#7ee0a6]" : "text-[#8fb0ff]"}>
                                {message.isRead ? "Read" : "Unread"}
                              </span>
                            ) : null}
                          </div>
                          <div className={`whitespace-pre-wrap text-sm leading-7 ${isOwn ? "text-white" : "text-[#435072]"}`}>
                            {message.content}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div
                ref={composerShellRef}
                className="absolute inset-x-0 bottom-0 z-20 border-t border-[#ebe5ff] bg-[linear-gradient(180deg,rgba(255,254,254,0.94)_0%,rgba(248,244,255,0.97)_100%)] px-6 py-5 shadow-[0_-16px_42px_-28px_rgba(139,92,246,0.28)] backdrop-blur-sm"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-4 shadow-[0_12px_28px_rgba(196,186,255,0.16)]">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    placeholder="Message everyone on this work order..."
                    rows={4}
                    spellCheck={false}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    data-lt-active="false"
                    data-ms-editor="false"
                    className="w-full resize-none border-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] px-2 py-2 text-sm text-[#2b3159] outline-none placeholder:text-[#8a96bb]"
                  />
                  <div className="mt-3 flex items-end justify-between gap-4 border-t border-[#ebe5ff] pt-3">
                    <div className="text-xs text-[#7280ad]">
                      Everyone assigned to this work order sees this thread. Press Ctrl/Cmd + Enter to send.
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(255,107,60,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[480px] items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] px-6">
              <div className="max-w-md text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-[#9aa6cc]" />
                <h3 className="mt-4 text-xl font-semibold text-[#2b3159]">No conversations yet</h3>
                <p className="mt-2 text-sm text-[#7280ad]">
                  Once messages exist on accessible work orders, they will appear here in a shared team inbox.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
