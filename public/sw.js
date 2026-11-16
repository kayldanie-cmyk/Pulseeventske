/* ─────────────────────────────────────────────────────────────────────────────
 * Pulse Events KE — Offline-First Service Worker
 *
 * Strategy:
 *  • App Shell (HTML, CSS, JS, fonts) → Cache-First with network update
 *  • /api/tickets/verify           → Network-First, offline fallback to IndexedDB
 *  • Scanner page                  → Cache-First so gate crew can open it offline
 *  • Everything else               → Network-First with cache fallback
 *
 * Offline Gate Scanning:
 *  When online, the scanner pre-fetches valid ticket hashes for the active event
 *  and stores them in IndexedDB. When offline, verification runs locally against
 *  the cached hashes, and scan results are queued for sync when connectivity
 *  returns (via Background Sync API if available, or manual flush).
 * ───────────────────────────────────────────────────────────────────────────── */

const CACHE_NAME = "pulse-ke-v1";
const APP_SHELL = [
  "/scanner",
  "/manifest.json",
];

/* ═══════ Install ═══════ */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* ═══════ Activate — purge old caches ═══════ */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ═══════ IndexedDB helpers for offline ticket cache ═══════ */
function openTicketDB() {
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

async function getCachedTicket(code) {
  const db = await openTicketDB();
  return new Promise((resolve) => {
    const tx = db.transaction("tickets", "readonly");
    const req = tx.objectStore("tickets").get(code);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function markTicketUsedLocally(code) {
  const db = await openTicketDB();
  return new Promise((resolve) => {
    const tx = db.transaction("tickets", "readwrite");
    const store = tx.objectStore("tickets");
    const req = store.get(code);
    req.onsuccess = () => {
      const ticket = req.result;
      if (ticket) {
        ticket.status = "used";
        ticket.used_at = new Date().toISOString();
        store.put(ticket);
      }
      resolve(ticket);
    };
    req.onerror = () => resolve(null);
  });
}

async function queuePendingScan(scanRecord) {
  const db = await openTicketDB();
  return new Promise((resolve) => {
    const tx = db.transaction("pendingScans", "readwrite");
    tx.objectStore("pendingScans").add(scanRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/* ═══════ Offline ticket verification ═══════ */
async function offlineVerify(code) {
  const ticket = await getCachedTicket(code);

  if (!ticket) {
    return new Response(
      JSON.stringify({
        valid: false,
        offline: true,
        reason: "Ticket not found in offline cache. Connect to sync tickets.",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (ticket.status === "used") {
    return new Response(
      JSON.stringify({
        valid: false,
        offline: true,
        alreadyUsed: true,
        usedAt: ticket.used_at,
        reason: `Already checked in at ${ticket.used_at}`,
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  if (ticket.status === "void") {
    return new Response(
      JSON.stringify({
        valid: false,
        offline: true,
        reason: "Ticket has been cancelled or voided.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mark as used locally and queue for sync
  await markTicketUsedLocally(code);
  await queuePendingScan({
    code,
    action: "check_in",
    timestamp: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      valid: true,
      offline: true,
      ticket: {
        code: ticket.code,
        tierId: ticket.tier_name || "General Admission",
        eventId: ticket.event_id,
      },
      message: "OFFLINE ADMIT — Will sync when connected",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

/* ═══════ Fetch handler ═══════ */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ticket verify endpoint — network first, offline fallback
  if (
    url.pathname === "/api/tickets/verify" &&
    event.request.method === "POST"
  ) {
    event.respondWith(
      fetch(event.request.clone())
        .catch(async () => {
          // Offline — parse the request body and verify locally
          try {
            const body = await event.request.json();
            return offlineVerify(body.code);
          } catch {
            return new Response(
              JSON.stringify({
                valid: false,
                offline: true,
                reason: "Offline and unable to process request.",
              }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          }
        })
    );
    return;
  }

  // Scanner page — cache first
  if (url.pathname === "/scanner") {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((resp) => {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            return resp;
          })
      )
    );
    return;
  }

  // All other requests — network first, cache fallback
  if (event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

/* ═══════ Background Sync for queued scans ═══════ */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-scans") {
    event.waitUntil(flushPendingScans());
  }
});

async function flushPendingScans() {
  const db = await openTicketDB();
  const tx = db.transaction("pendingScans", "readwrite");
  const store = tx.objectStore("pendingScans");

  return new Promise((resolve) => {
    const req = store.openCursor();
    const toDelete = [];

    req.onsuccess = async () => {
      const cursor = req.result;
      if (!cursor) {
        // Delete all successfully synced records
        const delTx = db.transaction("pendingScans", "readwrite");
        const delStore = delTx.objectStore("pendingScans");
        toDelete.forEach((key) => delStore.delete(key));
        resolve();
        return;
      }

      const scan = cursor.value;
      try {
        const resp = await fetch("/api/tickets/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: scan.code,
            hash: "offline_sync",
            offlineTimestamp: scan.timestamp,
          }),
        });
        if (resp.ok || resp.status === 409) {
          // 409 = already used, still counts as synced
          toDelete.push(cursor.key);
        }
      } catch {
        // Still offline, will retry next sync
      }
      cursor.continue();
    };
    req.onerror = () => resolve();
  });
}

/* ═══════ Message handler — receive ticket cache updates ═══════ */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_TICKETS") {
    event.waitUntil(cacheTickets(event.data.tickets));
  }
  if (event.data && event.data.type === "FLUSH_SCANS") {
    event.waitUntil(flushPendingScans());
  }
});

async function cacheTickets(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return;
  const db = await openTicketDB();
  const tx = db.transaction("tickets", "readwrite");
  const store = tx.objectStore("tickets");
  tickets.forEach((t) => {
    if (t.code) store.put(t);
  });
}
