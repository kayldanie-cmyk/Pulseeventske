"use client";

import { useEffect } from "react";

/**
 * Registers the Pulse Events KE service worker for offline gate scanning.
 * Place this component once in the app layout (or scanner page).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[Pulse SW] Registered:", reg.scope);

        // Listen for updates
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            if (
              installing.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              console.log("[Pulse SW] Updated and active.");
            }
          };
        };
      })
      .catch((err) => {
        console.warn("[Pulse SW] Registration failed:", err);
      });
  }, []);

  return null;
}
