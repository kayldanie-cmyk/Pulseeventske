"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

/* ─────────────────────────────────────────────────────────────────────────────
 * Offline-First PWA Gate Scanner
 *
 * Features:
 *   • Network-first ticket verification with offline IndexedDB fallback
 *   • Pre-download event ticket hashes for offline gate operation
 *   • Audio-haptic feedback (green chime = valid, red buzz = invalid)
 *   • QR Camera scanning via getUserMedia + BarcodeDetector API
 *   • Pending scan queue with sync status indicator
 *   • Background Sync integration via service worker
 * ───────────────────────────────────────────────────────────────────────────── */

interface ScanRecord {
  code: string;
  status: "valid" | "already_used" | "invalid";
  timestamp: string;
  message: string;
  tier?: string;
  offline?: boolean;
}

/* ═══════ Audio feedback (Web Audio API — no files needed) ═══════ */
function playFeedback(type: "valid" | "invalid" | "already_used") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "valid") {
      // Rising chime: C5 → E5
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "already_used") {
      // Double low beep
      osc.type = "square";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Harsh buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }

    // Haptic feedback if available
    if ("vibrate" in navigator) {
      navigator.vibrate(type === "valid" ? [100] : type === "already_used" ? [80, 50, 80] : [200, 50, 200]);
    }
  } catch {
    // Audio context not available (e.g. autoplay policy)
  }
}

/* ═══════ IndexedDB helpers (mirror of service worker) ═══════ */
function openTicketDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pulse-tickets", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tickets")) {
        db.createObjectStore("tickets", { keyPath: "code" });
      }
      if (!db.objectStoreNames.contains("pendingScans")) {
        db.createObjectStore("pendingScans", { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingScanCount(): Promise<number> {
  try {
    const db = await openTicketDB();
    return new Promise((resolve) => {
      const tx = db.transaction("pendingScans", "readonly");
      const req = tx.objectStore("pendingScans").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function getCachedTicketCount(): Promise<number> {
  try {
    const db = await openTicketDB();
    return new Promise((resolve) => {
      const tx = db.transaction("tickets", "readonly");
      const req = tx.objectStore("tickets").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export default function GateScannerPage() {
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingScans, setPendingScans] = useState(0);
  const [cachedTickets, setCachedTickets] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ═══════ Online/Offline detection ═══════ */
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Load cached counts
    getPendingScanCount().then(setPendingScans);
    getCachedTicketCount().then(setCachedTickets);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ═══════ Auto focus input ═══════ */
  useEffect(() => {
    if (!cameraActive) inputRef.current?.focus();
  }, [cameraActive]);

  /* ═══════ Refresh pending counts periodically ═══════ */
  useEffect(() => {
    const interval = setInterval(() => {
      getPendingScanCount().then(setPendingScans);
      getCachedTicketCount().then(setCachedTickets);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ═══════ Manual sync flush ═══════ */
  const flushScans = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      // Try Background Sync first
      const reg = await navigator.serviceWorker?.ready;
      if (reg && "sync" in reg) {
        await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-scans");
      } else {
        // Fallback: message the SW to flush
        reg?.active?.postMessage({ type: "FLUSH_SCANS" });
      }
      // Wait a beat then refresh count
      await new Promise((r) => setTimeout(r, 2000));
      const count = await getPendingScanCount();
      setPendingScans(count);
    } catch {
      // Sync registration failed
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing]);

  /* ═══════ Camera QR scanning ═══════ */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start QR detection loop
      if ("BarcodeDetector" in window) {
        const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue.trim().toUpperCase();
              if (code) {
                setInputCode(code);
                stopCamera();
                // Auto-verify after a tick
                setTimeout(() => handleVerifyCode(code), 100);
              }
            }
          } catch {
            // Detection error — continue
          }
        }, 300);
      }
    } catch {
      alert("Camera access denied or not available. Please enter codes manually.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  /* ═══════ Cleanup camera on unmount ═══════ */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  /* ═══════ Verify ticket ═══════ */
  const handleVerifyCode = async (codeOverride?: string) => {
    const code = (codeOverride || inputCode).trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setInputCode("");

    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          hash: "gate_scanner_pwa",
        }),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      let record: ScanRecord;
      if (res.ok && data.valid) {
        record = {
          code,
          status: "valid",
          timestamp: timeStr,
          message: data.offline
            ? "OFFLINE ADMIT — Will sync when connected"
            : "VALID ENTRY — ADMISSION GRANTED",
          tier: data.ticket?.tierId || "General Admission",
          offline: data.offline,
        };
        setValidCount((c) => c + 1);
      } else if (data.alreadyUsed) {
        record = {
          code,
          status: "already_used",
          timestamp: timeStr,
          message: `ALREADY USED at ${data.usedAt || "Earlier today"}`,
          offline: data.offline,
        };
      } else {
        record = {
          code,
          status: "invalid",
          timestamp: timeStr,
          message: data.reason || "INVALID TICKET CODE",
          offline: data.offline,
        };
      }

      if (soundEnabled) playFeedback(record.status);

      setLastScan(record);
      setHistory((prev) => [record, ...prev.slice(0, 49)]);
      setTotalScanned((c) => c + 1);

      // Update pending count after offline scans
      if (data.offline) {
        const count = await getPendingScanCount();
        setPendingScans(count);
      }
    } catch {
      // Network error — handled by service worker offline fallback
      const fallbackRecord: ScanRecord = {
        code,
        status: "invalid",
        timestamp: new Date().toLocaleTimeString(),
        message: "NETWORK ERROR — Service worker may handle offline",
        offline: true,
      };
      if (soundEnabled) playFeedback("invalid");
      setLastScan(fallbackRecord);
      setHistory((prev) => [fallbackRecord, ...prev.slice(0, 49)]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleVerifyCode();
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-20 min-h-screen px-4 sm:px-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--a)] bg-[var(--card)] border border-[var(--line)] px-3 py-1 rounded-full mb-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
              {isOnline ? "Online" : "Offline Mode"}
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold"
              style={{ fontFamily: "Syne" }}
            >
              Ticket Scanner Terminal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="chip !text-[11px] !min-h-0 !py-1.5 !px-3"
              title={soundEnabled ? "Mute audio feedback" : "Enable audio feedback"}
            >
              {soundEnabled ? "🔊 Sound On" : "🔇 Muted"}
            </button>
            <Link href="/dashboard" className="btn ghost text-xs">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Offline Status Banner */}
        {!isOnline && (
          <div className="p-4 rounded-xl mb-6 bg-amber-950/60 border border-amber-500/50 text-amber-200 text-sm flex items-center gap-3">
            <span className="text-xl">📡</span>
            <div>
              <strong>Offline Mode Active</strong> — Verifying against{" "}
              <strong>{cachedTickets}</strong> cached tickets.
              {pendingScans > 0 && (
                <> {pendingScans} scan{pendingScans !== 1 ? "s" : ""} pending sync.</>
              )}
            </div>
          </div>
        )}

        {/* Pending Sync Banner */}
        {isOnline && pendingScans > 0 && (
          <div className="p-4 rounded-xl mb-6 bg-blue-950/60 border border-blue-500/50 text-blue-200 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔄</span>
              <span>
                <strong>{pendingScans}</strong> offline scan{pendingScans !== 1 ? "s" : ""}{" "}
                waiting to sync.
              </span>
            </div>
            <button
              type="button"
              onClick={flushScans}
              disabled={syncing}
              className="btn ghost text-xs !py-1.5 !px-3"
            >
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        )}

        {/* Scan Input Box */}
        <div className="panel !p-6 mb-8 border-[var(--line)] shadow-xl">
          {/* Camera QR Scanner */}
          {cameraActive && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-black aspect-[4/3] max-w-sm mx-auto">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-[var(--a)] rounded-xl pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/40 rounded-lg" />
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold"
              >
                ✕ Close Camera
              </button>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)]">
              Scan Barcode / QR or Enter Ticket Code
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. TKT-B4A19F"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="flex-1 min-w-0 px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-lg font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--a)] tracking-wider"
              />
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className="btn ghost !px-3"
                title="Toggle QR Camera"
              >
                📷
              </button>
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="btn px-4 sm:px-6 text-sm font-bold whitespace-nowrap"
              >
                {loading ? "…" : "Scan"}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-fills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--line)]/50 text-xs text-[var(--mute)]">
            <span>Test:</span>
            {["TKT-B4A19F", "TKT-C8D32E", "TKT-7F02A4"].map((tc) => (
              <button
                key={tc}
                type="button"
                onClick={() => {
                  setInputCode(tc);
                  setTimeout(() => handleVerifyCode(tc), 50);
                }}
                className="chip !text-[11px] !min-h-0 !py-1 !px-2.5 font-mono"
              >
                {tc}
              </button>
            ))}
          </div>
        </div>

        {/* Live Verification Result Banner */}
        {lastScan && (
          <div
            className={`p-5 sm:p-6 rounded-2xl mb-8 border-2 transition-all flex items-center justify-between gap-4 ${
              lastScan.status === "valid"
                ? "bg-emerald-950/60 border-emerald-500 text-emerald-200"
                : lastScan.status === "already_used"
                ? "bg-amber-950/60 border-amber-500 text-amber-200"
                : "bg-red-950/60 border-red-500 text-red-200"
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest font-mono opacity-80 flex items-center gap-2 flex-wrap">
                <span>Ticket: {lastScan.code}</span>
                {lastScan.offline && (
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                    OFFLINE
                  </span>
                )}
              </div>
              <div
                className="text-lg sm:text-2xl font-black mt-1 break-words"
                style={{ fontFamily: "Syne" }}
              >
                {lastScan.message}
              </div>
              {lastScan.tier && (
                <div className="text-xs mt-1 font-semibold opacity-90">
                  Admit to: {lastScan.tier}
                </div>
              )}
            </div>
            <div className="text-3xl sm:text-4xl flex-shrink-0">
              {lastScan.status === "valid" ? "✓" : "✗"}
            </div>
          </div>
        )}

        {/* Gate Session Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="panel !p-4 text-center">
            <span className="text-xs text-[var(--mute)] block">Total Scans</span>
            <b className="text-2xl font-bold font-mono text-[var(--ink)]">
              {totalScanned}
            </b>
          </div>
          <div className="panel !p-4 text-center">
            <span className="text-xs text-[var(--mute)] block">Admitted</span>
            <b className="text-2xl font-bold font-mono text-emerald-400">
              {validCount}
            </b>
          </div>
          <div className="panel !p-4 text-center">
            <span className="text-xs text-[var(--mute)] block">Rate</span>
            <b className="text-2xl font-bold font-mono text-[var(--a)]">
              {totalScanned > 0
                ? Math.round((validCount / totalScanned) * 100)
                : 100}
              %
            </b>
          </div>
          <div className="panel !p-4 text-center">
            <span className="text-xs text-[var(--mute)] block">Cached</span>
            <b className="text-2xl font-bold font-mono text-blue-400">
              {cachedTickets}
            </b>
          </div>
        </div>

        {/* Recent Gate Scan Log */}
        <div className="panel !p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--mute)] mb-4">
            Recent Gate Log
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-[var(--mute)] py-4 text-center">
              No tickets scanned in this terminal session yet. Scan a code to begin.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]/50">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs flex-wrap"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        h.status === "valid"
                          ? "bg-emerald-400"
                          : h.status === "already_used"
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                    ></span>
                    <span className="font-mono font-bold text-[var(--ink)]">
                      {h.code}
                    </span>
                    {h.offline && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">
                        offline
                      </span>
                    )}
                  </div>
                  <span className="text-[var(--mute)] truncate max-w-[180px]">
                    {h.message}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--mute)] flex-shrink-0">
                    {h.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
