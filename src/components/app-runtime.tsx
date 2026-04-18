"use client";

import { useEffect, useState } from "react";

type DensityMode = "comfortable" | "compact";

const THEME_STORAGE_KEY = "ppw-theme-mode";
const DENSITY_STORAGE_KEY = "ppw-density-mode";

function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = "light";
  root.style.colorScheme = "light";
}

function applyDensity(mode: DensityMode) {
  document.documentElement.dataset.density = mode;
}

export function AppRuntime() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function clearLegacyAppCaches() {
      if (typeof window === "undefined") {
        return;
      }

      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (registration) => {
              const scriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? "";
              if (scriptUrl.includes("/sw.js")) {
                await registration.unregister();
              }
            })
          );
        } catch {
          // Keep runtime resilient even if service worker cleanup fails.
        }
      }

      if ("caches" in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith("ppw-shell"))
              .map((key) => window.caches.delete(key))
          );
        } catch {
          // Ignore cache cleanup failures and allow normal app boot.
        }
      }

      if (!cancelled) {
        window.sessionStorage.setItem("ppw-cache-cleared", "1");
      }
    }

    const storedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    const safeDensity = storedDensity === "compact" ? "compact" : "comfortable";

    setIsOffline(!navigator.onLine);
    applyTheme();
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    applyDensity(safeDensity);

    const handleConnectivityChange = () => setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);

    if (window.sessionStorage.getItem("ppw-cache-cleared") !== "1") {
      void clearLegacyAppCaches();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
    };
  }, []);

  return (
    <>
      {isOffline ? (
        <div className="fixed bottom-5 right-5 z-[95] rounded-full border border-[rgba(255,185,205,0.88)] bg-[linear-gradient(135deg,rgba(255,243,248,0.96)_0%,rgba(245,240,255,0.96)_100%)] px-3 py-1.5 text-xs font-semibold text-[#a53a74] shadow-[0_10px_24px_rgba(204,165,214,0.22)]">
          Offline mode active
        </div>
      ) : null}
    </>
  );
}
