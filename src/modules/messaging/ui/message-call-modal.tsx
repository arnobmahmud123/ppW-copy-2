"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MonitorUp,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width: string;
        height: string;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => {
      executeCommand: (command: string, ...args: unknown[]) => void;
      addListener: (event: string, handler: (...args: unknown[]) => void) => void;
      dispose: () => void;
    };
  }
}

type CallParticipant = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
  leftAt: string | null;
  lastSeenAt: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
};

type ActiveCall = {
  id: string;
  roomName: string;
  title: string | null;
  mode: "AUDIO" | "VIDEO";
  status: string;
  startedAt: string;
  endedAt: string | null;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  participants: CallParticipant[];
};

type MessageCallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: ActiveCall | null;
  session: {
    id: string;
    name: string;
  };
  threadName: string;
  onCallUpdated: (call: ActiveCall | null) => void;
};

let jitsiScriptPromise: Promise<void> | null = null;

function ensureJitsiScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise;
  }

  jitsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi-external-api="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load conference script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.dataset.jitsiExternalApi = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load conference script."));
    document.body.appendChild(script);
  });

  return jitsiScriptPromise;
}

export function MessageCallModal({
  open,
  onOpenChange,
  call,
  session,
  threadName,
  onCallUpdated,
}: MessageCallModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{
    executeCommand: (command: string, ...args: unknown[]) => void;
    addListener: (event: string, handler: (...args: unknown[]) => void) => void;
    dispose: () => void;
  } | null>(null);
  const leaveOnCleanupRef = useRef(true);
  const micEnabledRef = useRef(true);
  const cameraEnabledRef = useRef(true);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(call?.mode === "VIDEO");
  const [fallbackRoomUrl, setFallbackRoomUrl] = useState<string | null>(null);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [conferenceReady, setConferenceReady] = useState(false);

  useEffect(() => {
    leaveOnCleanupRef.current = true;
    if (!call) {
      setCameraEnabled(true);
      setMicEnabled(true);
      setSharingScreen(false);
      setRecording(false);
      setConferenceReady(false);
      return;
    }

    const selfParticipant = call.participants.find((participant) => participant.userId === session.id);
    setMicEnabled(selfParticipant?.micEnabled ?? true);
    setCameraEnabled(
      typeof selfParticipant?.cameraEnabled === "boolean"
        ? selfParticipant.cameraEnabled
        : call.mode === "VIDEO"
    );
  }, [call, session.id]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled;
  }, [cameraEnabled]);

  const participantCount = call?.participants.length ?? 0;
  const startedLabel = useMemo(() => {
    if (!call?.startedAt) {
      return "";
    }

    return new Date(call.startedAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [call?.startedAt]);

  useEffect(() => {
    if (!open || !call || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let heartbeatId: number | null = null;

    const bootstrap = async () => {
      setLoading(true);
      setNotice(null);
      setFallbackRoomUrl(null);
      setConferenceReady(false);

      try {
        await patchCall("heartbeat", {
          micEnabled: micEnabledRef.current,
          cameraEnabled: cameraEnabledRef.current,
        });
        await ensureJitsiScript();
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) {
          return;
        }

        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: call.roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: session.name,
          },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: call.mode === "AUDIO",
            startAudioOnly: call.mode === "AUDIO",
            disableDeepLinking: true,
            toolbarButtons: [
              "microphone",
              "camera",
              "desktop",
              "chat",
              "tileview",
              "hangup",
              "fullscreen",
              "participants-pane",
              "settings",
            ],
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
          },
        });

        apiRef.current = api;

        api.addListener("readyToClose", () => {
          onOpenChange(false);
        });
        api.addListener("videoConferenceJoined", () => {
          setLoading(false);
          setConferenceReady(true);
        });
        api.addListener("participantJoined", () => {
          void refreshCallState();
        });
        api.addListener("participantLeft", () => {
          void refreshCallState();
        });
        api.addListener("screenSharingStatusChanged", (status: { on?: boolean } | undefined) => {
          setSharingScreen(Boolean(status?.on));
        });
        api.addListener("recordingStatusChanged", (status: { on?: boolean } | undefined) => {
          setRecording(Boolean(status?.on));
        });

        heartbeatId = window.setInterval(() => {
          void patchCall("heartbeat", {
            micEnabled: micEnabledRef.current,
            cameraEnabled: cameraEnabledRef.current,
          });
        }, 15000);
      } catch (error) {
        setLoading(false);
        const fallbackUrl = `https://meet.jit.si/${encodeURIComponent(call.roomName)}#config.prejoinPageEnabled=false&config.startWithVideoMuted=${call.mode === "AUDIO"}&config.startAudioOnly=${call.mode === "AUDIO"}`;
        setFallbackRoomUrl(fallbackUrl);
        setConferenceReady(false);
        setNotice(
          error instanceof Error
            ? `${error.message} Opened fallback conference view instead.`
            : "Unable to load the embedded conference controls. Showing fallback conference view."
        );
      }
    };

    const refreshCallState = async () => {
      if (!call) {
        return;
      }

      const response = await fetch(`/api/messages/calls/${call.id}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as { call?: ActiveCall | null };
      if (response.ok) {
        onCallUpdated(payload.call ?? null);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }
      apiRef.current?.dispose();
      apiRef.current = null;
      if (leaveOnCleanupRef.current && call) {
        void patchCall("leave");
      }
    };
  }, [open, call?.id]);

  async function patchCall(
    action: "heartbeat" | "leave" | "end",
    extra?: { micEnabled?: boolean; cameraEnabled?: boolean }
  ) {
    if (!call) {
      return;
    }

    const response = await fetch(`/api/messages/calls/${call.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        ...extra,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      call?: ActiveCall | null;
      error?: string;
    };

    if (!response.ok) {
      setNotice(payload.error ?? "Unable to update the conference.");
      return;
    }

    onCallUpdated(payload.call ?? null);
  }

  function handleToggleMic() {
    if (!apiRef.current || !conferenceReady) {
      setNotice("Audio controls will be ready as soon as the conference finishes joining.");
      return;
    }
    apiRef.current?.executeCommand("toggleAudio");
    const next = !micEnabled;
    setMicEnabled(next);
    void patchCall("heartbeat", { micEnabled: next, cameraEnabled });
  }

  function handleToggleCamera() {
    if (!apiRef.current || !conferenceReady) {
      setNotice("Video controls will be ready as soon as the conference finishes joining.");
      return;
    }
    apiRef.current?.executeCommand("toggleVideo");
    const next = !cameraEnabled;
    setCameraEnabled(next);
    void patchCall("heartbeat", { micEnabled, cameraEnabled: next });
  }

  function handleHangup(endForEveryone: boolean) {
    leaveOnCleanupRef.current = false;
    apiRef.current?.executeCommand("hangup");
    apiRef.current?.dispose();
    apiRef.current = null;
    void patchCall(endForEveryone ? "end" : "leave");
    onOpenChange(false);
  }

  function handleToggleScreenShare() {
    if (!apiRef.current || !conferenceReady) {
      setNotice(
        fallbackRoomUrl
          ? "Use the built-in Jitsi toolbar inside the meeting view for screen sharing."
          : "Screen sharing is available once the embedded conference controls are ready."
      );
      return;
    }

    apiRef.current.executeCommand("toggleShareScreen");
    setSharingScreen((current) => !current);
    setNotice(null);
  }

  function handleToggleRecording() {
    if (!apiRef.current || !conferenceReady) {
      setNotice(
        fallbackRoomUrl
          ? "Recording is only available from the embedded conference controls when the meeting fully loads."
          : "Recording is only available in the embedded conference view once it is ready."
      );
      return;
    }

    try {
      if (recording) {
        apiRef.current.executeCommand("stopRecording", "file");
        setRecording(false);
        setNotice("Meeting recording stopped.");
        return;
      }

      apiRef.current.executeCommand("startRecording", {
        mode: "file",
        shouldShare: false,
      });
      setRecording(true);
      setNotice("Meeting recording started.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Recording could not be started in this conference."
      );
    }
  }

  if (!open || !call) {
    return null;
  }

  const usingFallbackRoom = Boolean(fallbackRoomUrl);
  const canUseEmbeddedControls = !usingFallbackRoom && conferenceReady;

  return (
    <div className="absolute inset-0 z-40 flex bg-slate-950/45 backdrop-blur-sm">
      <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fbf8ff_0%,#eef5ff_100%)]">
        <div className="flex items-center justify-between border-b border-white/60 bg-white/70 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900">
              {threadName} {call.mode === "AUDIO" ? "audio call" : "video conference"}
            </p>
            <p className="text-sm text-slate-500">
              Started {startedLabel} · {participantCount} participant{participantCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMic}
              disabled={!canUseEmbeddedControls}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                micEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            {call.mode === "VIDEO" ? (
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={!canUseEmbeddedControls}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                  cameraEnabled
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              disabled={!canUseEmbeddedControls}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                sharingScreen
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <MonitorUp className="h-4 w-4" />
              Share screen
            </button>
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={!canUseEmbeddedControls}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                recording
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Radio className="h-4 w-4" />
              {recording ? "Recording" : "Record"}
            </button>
            {usingFallbackRoom ? (
              <a
                href={fallbackRoomUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                Open full meeting
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => handleHangup(false)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Leave
            </button>
            <button
              type="button"
              onClick={() => handleHangup(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <PhoneOff className="h-4 w-4" />
              End call
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-0 bg-slate-950">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-white/80">
                Joining conference...
              </div>
            ) : null}
            {fallbackRoomUrl ? (
              <iframe
                title={`${threadName} conference room`}
                src={fallbackRoomUrl}
                className={cn("h-full w-full border-0", loading ? "opacity-0" : "opacity-100")}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
              />
            ) : (
              <div
                ref={containerRef}
                className={cn("h-full w-full", loading ? "opacity-0" : "opacity-100")}
              />
            )}
          </div>

          <aside className="flex min-h-0 flex-col border-l border-slate-200/70 bg-white/80">
            <div className="border-b border-slate-200/70 px-4 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-fuchsia-600" />
                <p className="text-sm font-semibold text-slate-900">Conference members</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Everyone in this thread can join the active room while the conference is live.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", "bg-emerald-50 text-emerald-700")}>
                  Voice built in
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", call.mode === "VIDEO" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500")}>
                  Video conferencing
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", sharingScreen ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500")}>
                  Screen sharing
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", recording ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500")}>
                  Meeting recording
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {call.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar name={participant.name} avatarUrl={participant.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {participant.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {participant.userId === session.id ? "You" : "In this conference"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-full",
                            participant.micEnabled ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}
                        >
                          {participant.micEnabled ? (
                            <Mic className="h-3.5 w-3.5" />
                          ) : (
                            <MicOff className="h-3.5 w-3.5" />
                          )}
                        </span>
                        {call.mode === "VIDEO" ? (
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full",
                              participant.cameraEnabled
                                ? "bg-sky-50 text-sky-600"
                                : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {participant.cameraEnabled ? (
                              <Video className="h-3.5 w-3.5" />
                            ) : (
                              <VideoOff className="h-3.5 w-3.5" />
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {notice ? (
              <div className="border-t border-slate-200/70 px-4 py-3 text-xs font-medium text-rose-600">
                {notice}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
