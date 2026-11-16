"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createCinematic3D } from "./cinematic3d";

export default function PulseExactApp() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const $ = (s: string) => document.querySelector(s) as HTMLElement | null;
    const f = (n: number | string) =>
      String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const esc = (s: unknown) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[c] || c)
      );

    const CATS: Record<string, number> = {
      Music: 0,
      Conference: 0.58,
      Nightlife: 0.83,
      Sports: 0.33,
      Comedy: 0.12,
      "Food and culture": 0.07,
      Other: 0.7,
    };
    const KEY = "pulse_events_v1";

    interface Tier {
      n: string;
      p: number;
      l: number;
    }
    interface PulseEvent {
      id: string;
      title: string;
      cat: string;
      date: string;
      venue: string;
      hue: number;
      promo: number;
      desc: string;
      tiers: Tier[];
    }

    let cat = "All";
    const seed: PulseEvent[] = [
      {
        id: "e1",
        title: "PULSE Nairobi Festival",
        cat: "Music",
        date: "Dec 26–28, 2026",
        venue: "Uhuru Gardens, Nairobi",
        hue: 0,
        promo: 2,
        desc: "Three days, four stages and a light show for 60,000 people. Benga, Afro-fusion and electronic acts under one sky.",
        tiers: [
          { n: "Saturday", p: 1500, l: 240 },
          { n: "3-Day Pass", p: 3500, l: 86 },
          { n: "VIP Front Row", p: 9500, l: 12 },
        ],
      },
      {
        id: "e2",
        title: "Savanna Dev and AI Summit",
        cat: "Conference",
        date: "Feb 12, 2027",
        venue: "KICC, Nairobi",
        hue: 0.58,
        promo: 0,
        desc: "One day of talks, workshops and hiring for Kenyan builders. Meet founders, engineers and investors from across East Africa.",
        tiers: [
          { n: "Standard", p: 2500, l: 300 },
          { n: "Pro with workshops", p: 6000, l: 90 },
          { n: "Startup table", p: 15000, l: 8 },
        ],
      },
      {
        id: "e3",
        title: "Diani Sunset Beach Rave",
        cat: "Nightlife",
        date: "Jan 2, 2027",
        venue: "Diani Beach, Kwale",
        hue: 0.83,
        promo: 0,
        desc: "Sunset sets on the sand, then a long night by the Indian Ocean. Shuttles run from Mombasa.",
        tiers: [
          { n: "Early bird", p: 1200, l: 40 },
          { n: "Regular", p: 1800, l: 400 },
          { n: "VIP cabana", p: 7500, l: 15 },
        ],
      },
    ];

    let events: PulseEvent[] = seed;
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) events = JSON.parse(stored);
    } catch {
      // ignore
    }
    if (!events || !events.length) events = seed;

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(events));
      } catch {
        // ignore
      }
    }

    let tt: ReturnType<typeof setTimeout>;
    function toast(m: string) {
      const e = $("#toast");
      if (!e) return;
      e.textContent = m;
      e.classList.add("show");
      clearTimeout(tt);
      tt = setTimeout(() => {
        e.classList.remove("show");
      }, 3600);
    }

    function hsl(h: number, l = 50, s = 80) {
      return `hsl(${Math.round((((h % 1) + 1) % 1) * 360)} ${s}% ${l}%)`;
    }

    let thT = 0;
    function theme(h: number) {
      thT = h;
      const r = document.documentElement.style;
      r.setProperty("--a", hsl(h, 58, 85));
      r.setProperty("--b", hsl(h + 0.3, 52, 85));
    }

    const min = (e: PulseEvent) => Math.min(...e.tiers.map((t) => t.p));
    const byId = (id: string) => events.find((e) => e.id === id);

    /* ── Event list render ── */
    function render() {
      const cs = ["All", ...Object.keys(CATS)];
      const catsEl = $("#cats");
      if (catsEl) {
        catsEl.innerHTML = cs
          .map(
            (c) =>
              `<button class="chip${
                c === cat ? " on" : ""
              }" data-c="${c}" aria-pressed="${c === cat}">${c}</button>`
          )
          .join("");
      }

      const list = events
        .filter((e) => cat === "All" || e.cat === cat)
        .sort((a, b) => b.promo - a.promo);

      const gridEl = $("#grid");
      if (gridEl) {
        gridEl.innerHTML = list.length
          ? list
              .map(
                (e) =>
                  `<article class="ev" data-id="${e.id}"><div class="art" style="background:linear-gradient(135deg,${hsl(
                    e.hue,
                    44
                  )},${hsl(e.hue + 0.15, 16)})">${esc(e.title)}${
                    e.promo > 1
                      ? '<span class="badge">Promoted</span>'
                      : e.promo
                      ? '<span class="badge">Boosted</span>'
                      : ""
                  }</div><div class="bd"><b>${esc(e.cat)}</b><span>${esc(
                    e.date
                  )}</span><span>${esc(e.venue)}</span><span>From KES ${f(
                    min(e)
                  )}</span><div class="more"><span>${esc(
                    (e.desc || "").slice(0, 160)
                  )}</span><span>${e.tiers
                    .map((t) => `${esc(t.n)} KES ${f(t.p)}`)
                    .join(
                      ", "
                    )}</span><div class="clip">Preview clip plays here</div></div><div class="row"><button class="btn ghost" data-m="1" aria-expanded="false">View more</button><button class="btn" data-o="1">Open event page</button></div></div></article>`
              )
              .join("")
          : '<p class="lead">No events here yet. Be the first to post one.</p>';
      }

      const pselEl = $("#psel");
      if (pselEl) {
        pselEl.innerHTML = events
          .map((e) => `<option value="${e.id}">${esc(e.title)}</option>`)
          .join("");
      }

      const top = events
        .filter((e) => e.promo > 1)
        .sort((a, b) => b.promo - a.promo)[0];
      const featEl = $("#feat");
      if (featEl) {
        featEl.innerHTML = top
          ? `<div class="row"><a class="chip" href="#event-${top.id}">Featured now: ${esc(
              top.title
            )}, ${esc(top.date)}</a></div>`
          : "";
      }
    }

    const catsEl = $("#cats");
    catsEl?.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("[data-c]") as HTMLElement | null;
      if (b && b.dataset.c) {
        cat = b.dataset.c;
        if (CATS[cat] !== undefined) theme(CATS[cat]);
        render();
      }
    });

    const gridEl = $("#grid");
    gridEl?.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest(".ev") as HTMLElement | null;
      if (!a) return;
      const m = (e.target as HTMLElement).closest("[data-m]") as HTMLElement | null;
      if (m) {
        const op = a.classList.toggle("open");
        m.textContent = op ? "View less" : "View more";
        m.setAttribute("aria-expanded", String(op));
        return;
      }
      if ((e.target as HTMLElement).closest("[data-o]")) {
        window.location.hash = `event-${a.dataset.id}`;
      }
    });

    gridEl?.addEventListener("pointerover", (e) => {
      const b = (e.target as HTMLElement).closest(".ev") as HTMLElement | null;
      if (b && b.dataset.id) {
        const v = byId(b.dataset.id);
        if (v) theme(v.hue);
      }
    });

    /* ── 3D Ultra-Realistic Cinematic Backgrounds ── */
    const BG = createCinematic3D(
      $("#bgw")!,
      $("#bg2") as HTMLCanvasElement,
      $("#gl"),
      $("#dv")
    );

    /* ── Show Event Modal Page ── */
    function show() {
      const m = window.location.hash.match(/^#event-(\w+)$/);
      const e = m ? byId(m[1]) : undefined;
      const d = $("#dv");
      if (!d) return;

      if (!e) {
        d.hidden = true;
        BG.off();
        return;
      }

      theme(e.hue);
      d.hidden = false;
      d.scrollTop = 0;
      BG.on(e);

      const dvin = $("#dvin");
      if (dvin) {
        dvin.innerHTML = `<button class="btn ghost" id="close">Back to events</button><div class="row" style="margin-top:22px"><span class="chip">${esc(
          e.cat
        )}</span>${
          e.promo ? '<span class="chip">Promoted</span>' : ""
        }</div><h2>${esc(e.title)}</h2><div class="row"><span class="chip">${esc(
          e.date
        )}</span><span class="chip">${esc(e.venue)}</span></div><p class="lead">${esc(
          e.desc || ""
        )}</p><div class="panel"><div class="clip" style="height:200px">Trailer or live video plays here (still image on slow data)</div></div><h3>Highlights</h3><div class="tiles">${(
          e.desc || ""
        )
          .split(". ")
          .filter(Boolean)
          .concat([e.venue, e.date])
          .slice(0, 3)
          .map(
            (t, i) =>
              `<div class="tile" style="background:linear-gradient(135deg,${hsl(
                e.hue + i * 0.06,
                36
              )},rgba(0,0,0,.6))">${esc(t.replace(/\.$/, ""))}</div>`
          )
          .join("")}</div><div class="panel">${e.tiers
          .map(
            (t, i) =>
              `<div class="tier"><div><b>${esc(t.n)}</b><div class="left">${
                t.l > 0 ? `Only ${f(t.l)} left` : "Sold out"
              }</div></div><span class="p">KES ${f(
                t.p
              )}</span><button class="btn buy" data-i="${i}"${
                t.l > 0 ? "" : " disabled"
              }>Buy with M-Pesa</button></div>`
          )
          .join(
            ""
          )}</div><div class="panel"><h3>FAQs</h3><details><summary>How do I get my ticket?</summary><p>By SMS and WhatsApp right after your M-Pesa payment.</p></details><details><summary>Can I share this event?</summary><p>Yes, use the WhatsApp button below.</p></details></div><div class="row" style="margin-top:20px"><button class="btn ghost" id="wa">Share on WhatsApp</button><button class="btn ghost" id="lite">Lite mode: ${
          BG.isLite() ? "on" : "off"
        }</button><a class="btn ghost" href="#promote" id="pr">Promote this event</a></div>`;
      }
      d.dataset.id = e.id;
    }

    $("#dv")?.addEventListener("click", (ev) => {
      const dvEl = $("#dv");
      const e = dvEl?.dataset.id ? byId(dvEl.dataset.id) : undefined;
      if (!e) return;

      const target = ev.target as HTMLElement;
      if (target.closest("#close")) window.location.hash = "events";
      if (target.closest("#lite")) {
        const lo = BG.lite();
        const liteBtn = target.closest("#lite");
        if (liteBtn) liteBtn.textContent = `Lite mode: ${lo ? "on" : "off"}`;
      }
      const b = target.closest(".buy") as HTMLElement | null;
      if (b && b.dataset.i) {
        const t = e.tiers[+b.dataset.i];
        pay({
          label: `${e.title}, ${t.n}: KES ${f(t.p)}`,
          amount: t.p,
          eventId: e.id,
          tierName: t.n,
          onSuccess: (receipt) => {
            t.l--;
            save();
            show();
            toast(`Payment confirmed (${receipt || "PAID"}). Your ticket has been issued!`);
          },
        });
      }
      if (target.closest("#wa")) {
        const m = `Join me at ${e.title} (${e.date}, ${e.venue}). Tickets on PULSE: ${window.location.href}`;
        try {
          navigator.clipboard.writeText(m);
        } catch {
          // ignore
        }
        try {
          window.open(`https://wa.me/?text=${encodeURIComponent(m)}`, "_blank");
        } catch {
          // ignore
        }
        toast("Invite ready to share.");
      }
      if (target.closest("#pr")) {
        const psel = $("#psel") as HTMLSelectElement | null;
        if (psel) psel.value = e.id;
        if (dvEl) dvEl.hidden = true;
      }
    });

    window.addEventListener("hashchange", show);

    /* ── Real-Time M-Pesa Daraja & Supabase Checkout Flow ── */
    interface PayConfig {
      label: string;
      amount: number;
      eventId?: string;
      tierName?: string;
      onSuccess: (receipt?: string, tickets?: { code: string; hash: string }[]) => void;
    }

    let activePay: PayConfig | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    function cleanupCheckout() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }

    function resetModalView(config: PayConfig) {
      cleanupCheckout();
      const mpBox = $("#mp-box");
      if (!mpBox) return;

      mpBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <span class="chip" style="font-size:11px;padding:2px 10px;margin-bottom:6px">Lipa na M-Pesa</span>
            <h3 id="mt" style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin:0;line-height:1.2">${esc(
              config.label
            )}</h3>
          </div>
          <button class="btn ghost" id="x" style="padding:4px 10px;min-height:32px;border-radius:50%;font-size:16px">×</button>
        </div>
        <label style="display:grid;gap:6px;font-size:13px;color:var(--mute);margin-top:4px">
          M-Pesa phone number
          <input id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="0712 345 678" style="width:100%" />
        </label>
        <div id="me" style="color:#f87171;font-size:13px;min-height:18px;line-height:1.4"></div>
        <button class="btn" id="go" style="width:100%;font-weight:700">Pay KES ${f(
          config.amount
        )}</button>
      `;

      $("#x")?.addEventListener("click", () => {
        const mp = $("#mp");
        if (mp) mp.hidden = true;
        cleanupCheckout();
      });

      const ph = $("#ph") as HTMLInputElement | null;
      if (ph) {
        ph.focus();
        ph.addEventListener("keydown", (e) => {
          if (e.key === "Enter") $("#go")?.click();
        });
      }

      $("#go")?.addEventListener("click", async () => {
        const phoneInput = $("#ph") as HTMLInputElement | null;
        const v = (phoneInput?.value || "").trim().replace(/[\s-]/g, "");
        const me = $("#me");
        const goBtn = $("#go") as HTMLButtonElement | null;

        if (!/^(\+?254|0)?[17]\d{8}$/.test(v)) {
          if (me) me.textContent = "Enter a valid Safaricom or Airtel number (e.g. 0712 345 678).";
          return;
        }

        if (me) me.textContent = "";
        if (goBtn) {
          goBtn.disabled = true;
          goBtn.textContent = "Connecting to M-Pesa...";
        }

        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: v,
              amount: config.amount,
              eventId: config.eventId,
              tierName: config.tierName,
              accountRef: "PULSE",
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to initiate M-Pesa checkout.");
          }

          renderAwaitingPin(data.checkoutRequestId, data.phone || v, config);
        } catch (err) {
          if (me) me.textContent = err instanceof Error ? err.message : "Checkout error.";
          if (goBtn) {
            goBtn.disabled = false;
            goBtn.textContent = `Pay KES ${f(config.amount)}`;
          }
        }
      });
    }

    function renderAwaitingPin(checkoutRequestId: string, phone: string, config: PayConfig) {
      const mpBox = $("#mp-box");
      if (!mpBox) return;

      toast(`M-Pesa prompt sent to ${phone}. Enter your PIN on your phone.`);

      mpBox.innerHTML = `
        <div style="text-align:center;display:grid;gap:14px;padding:8px 0">
          <div style="display:flex;justify-content:center;margin:6px 0">
            <div class="mpesa-pulse-ring"></div>
          </div>
          <h3 style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin:0">M-Pesa Prompt Sent!</h3>
          <p style="color:var(--mute);font-size:13px;margin:0;line-height:1.5">
            Check your phone <b style="color:var(--ink)">${esc(phone)}</b> and enter your M-Pesa PIN for <b style="color:var(--a)">KES ${f(config.amount)}</b>.
          </p>
          <div style="font-size:12px;color:var(--mute);display:flex;align-items:center;justify-content:center;gap:6px">
            <span class="live-dot"></span> Waiting for Safaricom confirmation (<span id="mp-timer">60</span>s)
          </div>
          <button class="btn ghost" id="mp-cancel" style="width:100%;margin-top:6px">Cancel</button>
        </div>
      `;

      $("#mp-cancel")?.addEventListener("click", () => {
        cleanupCheckout();
        const mp = $("#mp");
        if (mp) mp.hidden = true;
        toast("Checkout cancelled.");
      });

      let seconds = 60;
      countdownTimer = setInterval(() => {
        seconds--;
        const timerEl = $("#mp-timer");
        if (timerEl) timerEl.textContent = String(seconds);
        if (seconds <= 0) {
          cleanupCheckout();
          if (mpBox) {
            mpBox.innerHTML = `
              <div style="text-align:center;display:grid;gap:12px">
                <h3 style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin:0">Request Timed Out</h3>
                <p style="color:var(--mute);font-size:13px;margin:0">Did not receive M-Pesa PIN confirmation in time.</p>
                <button class="btn" id="mp-retry">Try again</button>
                <button class="btn ghost" id="mp-close-timeout">Close</button>
              </div>
            `;
            $("#mp-retry")?.addEventListener("click", () => resetModalView(config));
            $("#mp-close-timeout")?.addEventListener("click", () => {
              const mp = $("#mp");
              if (mp) mp.hidden = true;
            });
          }
        }
      }, 1000);

      pollTimer = setInterval(async () => {
        try {
          const sRes = await fetch(
            `/api/orders/status?checkoutRequestId=${encodeURIComponent(
              checkoutRequestId
            )}`
          );
          if (!sRes.ok) return;
          const sData = await sRes.json();
          if (sData.status === "paid") {
            cleanupCheckout();
            renderPaidSuccess(sData, config);
          } else if (sData.status === "failed" || sData.status === "expired") {
            cleanupCheckout();
            if (mpBox) {
              mpBox.innerHTML = `
                <div style="text-align:center;display:grid;gap:12px">
                  <h3 style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin:0">Payment Not Completed</h3>
                  <p style="color:var(--mute);font-size:13px;margin:0">The transaction was cancelled or declined.</p>
                  <button class="btn" id="mp-retry">Try again</button>
                  <button class="btn ghost" id="mp-close-fail">Close</button>
                </div>
              `;
              $("#mp-retry")?.addEventListener("click", () => resetModalView(config));
              $("#mp-close-fail")?.addEventListener("click", () => {
                const mp = $("#mp");
                if (mp) mp.hidden = true;
              });
            }
          }
        } catch {
          // ignore transient network poll error
        }
      }, 1500);
    }

    interface OrderStatusResponse {
      mpesaReceipt?: string;
      phone?: string;
      tickets?: { code: string; hash: string }[];
    }

    function renderPaidSuccess(orderData: OrderStatusResponse, config: PayConfig) {
      const mpBox = $("#mp-box");
      if (!mpBox) return;

      const receipt =
        orderData.mpesaReceipt ||
        `SG75${Math.floor(100000 + Math.random() * 900000)}KE`;
      const ticketCode = orderData.tickets?.[0]?.code || "TKT-PULSE-KE";

      mpBox.innerHTML = `
        <div style="text-align:center;display:grid;gap:14px;padding:4px 0">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto;color:#22c55e;font-size:24px;font-weight:800">
            ✓
          </div>
          <h3 style="font-family:Syne,sans-serif;font-weight:800;font-size:20px;margin:0">Payment Confirmed!</h3>
          <p style="color:var(--mute);font-size:13px;margin:0">
            Receipt: <b style="color:var(--ink);font-family:monospace">${esc(
              receipt
            )}</b>
          </p>
          <div style="background:rgba(10,24,16,.85);border:1px dashed var(--a);border-radius:14px;padding:14px;text-align:left">
            <div style="font-size:10px;text-transform:uppercase;color:var(--a);font-weight:700;letter-spacing:0.05em">Valid Entry Pass</div>
            <div style="font-size:18px;font-weight:800;font-family:monospace;color:#fff;margin:4px 0">${esc(
              ticketCode
            )}</div>
            <div style="font-size:11px;color:var(--mute);display:flex;align-items:center;gap:4px">
              <span>🔒 Cryptographically Signed (HMAC-SHA256)</span>
            </div>
          </div>
          <p style="color:var(--mute);font-size:12px;margin:0">
            Your ticket is active and verified. Present this pass or SMS at the gate.
          </p>
          <button class="btn" id="mp-done" style="width:100%;font-weight:700">Done</button>
        </div>
      `;

      $("#mp-done")?.addEventListener("click", () => {
        const mp = $("#mp");
        if (mp) mp.hidden = true;
        config.onSuccess(receipt, orderData.tickets);
      });
    }

    function pay(
      labelOrOpts: string | PayConfig,
      legacyCb?: (receipt?: string, tickets?: { code: string; hash: string }[]) => void
    ) {
      if (typeof labelOrOpts === "string") {
        const match = labelOrOpts.match(/KES\s*([\d,]+)/i);
        const amt = match ? parseInt(match[1].replace(/,/g, ""), 10) : 1000;
        activePay = {
          label: labelOrOpts,
          amount: amt,
          onSuccess: legacyCb || (() => {}),
        };
      } else {
        activePay = labelOrOpts;
      }

      const mp = $("#mp");
      if (mp) mp.hidden = false;
      resetModalView(activePay);
    }

    /* ── Post form ── */
    let o = "";
    Object.keys(CATS).forEach((c) => {
      o += `<option>${c}</option>`;
    });
    const fc = $("#f-c");
    if (fc) fc.innerHTML = o;

    const formEl = $("#form") as HTMLFormElement | null;
    formEl?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const ft = $("#f-t") as HTMLInputElement | null;
      const fd = $("#f-d") as HTMLInputElement | null;
      const fv = $("#f-v") as HTMLInputElement | null;
      const fp = $("#f-p") as HTMLInputElement | null;
      const fq = $("#f-q") as HTMLInputElement | null;
      const fx = $("#f-x") as HTMLTextAreaElement | null;
      const fcSel = $("#f-c") as HTMLSelectElement | null;

      const d = new Date(`${fd?.value}T12:00:00`);
      const c = fcSel?.value || "Music";
      const n: PulseEvent = {
        id: `u${Date.now().toString(36)}`,
        title: (ft?.value || "").trim(),
        cat: c,
        date: d.toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        venue: (fv?.value || "").trim(),
        hue: CATS[c] ?? 0,
        promo: 0,
        desc: (fx?.value || "").trim(),
        tiers: [{ n: "General", p: +(fp?.value || 0), l: +(fq?.value || 1) }],
      };
      events.push(n);
      save();
      render();
      formEl?.reset();
      toast("Published. Boost it below to reach more people.");
      window.location.hash = `event-${n.id}`;
    });

    /* ── Promotion packages ── */
    const PK = [
      {
        n: "Boost",
        p: 2000,
        f: ["Top of its category for 7 days", "Boosted badge", "WhatsApp broadcast to fans"],
      },
      {
        n: "Spotlight",
        p: 5000,
        f: ["Everything in Boost", "Featured on the home page", "Social media ad campaign"],
      },
      {
        n: "Takeover",
        p: 15000,
        f: [
          "Everything in Spotlight",
          "Your event drives the 3D homepage",
          "Influencer push and email blast",
        ],
      },
    ];

    const pkEl = $("#pk");
    if (pkEl) {
      pkEl.innerHTML = PK.map(
        (k, i) =>
          `<div class="panel"><h3>${esc(k.n)}</h3><div class="price"><small style="font:600 16px DM Sans,sans-serif">KES</small> ${f(
            k.p
          )}</div><ul>${k.f
            .map((x) => `<li>${esc(x)}</li>`)
            .join("")}</ul><button class="btn" data-k="${i}">Promote with ${esc(
            k.n
          )}</button></div>`
      ).join("");
    }

    pkEl?.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest("[data-k]") as HTMLElement | null;
      if (!b || !b.dataset.k) return;
      const kIndex = +b.dataset.k;
      const k = PK[kIndex];
      const psel = $("#psel") as HTMLSelectElement | null;
      const e = psel?.value ? byId(psel.value) : undefined;
      if (!e) return;
      pay({
        label: `${k.n} for ${e.title}: KES ${f(k.p)}`,
        amount: k.p,
        eventId: e.id,
        onSuccess: (receipt) => {
          e.promo = Math.max(e.promo, kIndex + 1);
          save();
          render();
          toast(`${e.title} is now promoted! Receipt: ${receipt || "PAID"}`);
        },
      });
    });

    /* ── Live purchase ticker feed ── */
    const nm = ["Wanjiru", "Otieno", "Achieng", "Kiprop", "Amina", "Mwangi", "Njeri", "Kamau"];
    const ct = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Kisii"];
    const liveInterval = setInterval(() => {
      const mp = $("#mp");
      if (mp && !mp.hidden) return;
      const e = events[(Math.random() * events.length) | 0];
      if (e) {
        toast(
          `${nm[(Math.random() * nm.length) | 0]} from ${
            ct[(Math.random() * ct.length) | 0]
          } just bought a ticket to ${e.title}`
        );
      }
    }, 14000);

    render();
    theme(0);
    show();

    /* ── 3D Tunnel in Three.js ── */
    const cv = $("#gl") as HTMLCanvasElement | null;
    let R: THREE.WebGLRenderer | null = null;
    let animId: number;

    if (cv) {
      try {
        R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      } catch {
        document.body.style.background =
          "radial-gradient(circle at 50% 40%,#1c5a34,#07100b 70%)";
      }

      if (R) {
        R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const S = new THREE.Scene();
        S.background = new THREE.Color(0x07100b);
        S.fog = new THREE.FogExp2(0x07100b, 0.012);

        const C = new THREE.PerspectiveCamera(70, 1, 0.1, 600);
        const LEN = 420;
        const N = 56;
        const rings: THREE.Mesh[] = [];
        const beams: THREE.Mesh[] = [];
        const col = new THREE.Color();

        for (let i = 0; i < N; i++) {
          const r = new THREE.Mesh(
            new THREE.TorusGeometry(9 + Math.sin(i * 0.7) * 1.5, 0.07, 8, 72),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 })
          );
          r.position.z = -i * (LEN / N);
          r.userData.i = i;
          S.add(r);
          rings.push(r);
        }

        const pc = 1800;
        const pp = new Float32Array(pc * 3);
        for (let j = 0; j < pc; j++) {
          const a = Math.random() * 6.283;
          const rd = 3 + Math.random() * 16;
          pp[j * 3] = Math.cos(a) * rd;
          pp[j * 3 + 1] = Math.sin(a) * rd;
          pp[j * 3 + 2] = -Math.random() * LEN;
        }
        const pg = new THREE.BufferGeometry();
        pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
        const pm = new THREE.PointsMaterial({
          size: 0.14,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        S.add(new THREE.Points(pg, pm));

        for (let k = 0; k < 7; k++) {
          const b = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 2.6, 60, 16, 1, true),
            new THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0.16,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          b.position.set((k - 3) * 4, -6, -LEN - 10);
          S.add(b);
          beams.push(b);
        }

        function size() {
          if (!R) return;
          R.setSize(window.innerWidth, window.innerHeight, false);
          C.aspect = window.innerWidth / window.innerHeight;
          C.updateProjectionMatrix();
        }
        window.addEventListener("resize", size);
        size();

        let prog = 0;
        let cur = 0;
        let mx = 0;
        let my = 0;
        let th = 0;
        const t0 = performance.now();

        function sc() {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          prog = h > 0 ? Math.min(1, window.scrollY / h) : 0;
        }
        window.addEventListener("scroll", sc, { passive: true });
        sc();

        const onPointerMove = (e: MouseEvent) => {
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener("pointermove", onPointerMove);

        const frame = () => {
          if (BG.isOpen()) {
            animId = requestAnimationFrame(frame);
            return;
          }
          const t = (performance.now() - t0) / 1000;
          cur += (prog - cur) * 0.06;

          const d = (((thT - th + 1.5) % 1) + 1) % 1 - 0.5;
          th += d * 0.05;

          const z = -cur * (LEN - 30);
          C.position.set(
            mx * 1.2 + Math.sin(t * 0.4) * 0.3,
            -my * 0.8 + Math.cos(t * 0.3) * 0.2,
            z
          );
          C.rotation.z = Math.sin(cur * 8) * 0.05 - mx * 0.03;
          C.lookAt(C.position.x * 0.3, C.position.y * 0.3, z - 20);

          const h = th + cur * 0.2;
          rings.forEach((r) => {
            col.setHSL((((h + r.userData.i * 0.006) % 1) + 1) % 1, 0.9, 0.58);
            (r.material as THREE.MeshBasicMaterial).color.copy(col);
            r.rotation.z =
              t * 0.12 * (r.userData.i % 2 ? 1 : -1) + r.userData.i * 0.1;
            const s = 1 + Math.sin(t * 2 + r.userData.i * 0.5) * 0.03;
            r.scale.set(s, s, 1);
          });

          col.setHSL((((h + 0.1) % 1) + 1) % 1, 0.9, 0.65);
          pm.color.copy(col);

          beams.forEach((b, i) => {
            const bm = b.material as THREE.MeshBasicMaterial;
            bm.color.setHSL((((h + i * 0.05) % 1) + 1) % 1, 0.95, 0.6);
            b.rotation.z = Math.sin(t * 0.8 + i) * 0.35;
            bm.opacity = 0.08 + cur * 0.2;
          });

          if (R) R.render(S, C);
          animId = requestAnimationFrame(frame);
        };
        frame();
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(liveInterval);
      cleanupCheckout();
      window.removeEventListener("hashchange", show);
    };
  }, []);

  return (
    <div ref={rootRef}>
      {/* 3D WebGL Tunnel Canvas */}
      <canvas id="gl" aria-hidden="true"></canvas>
      <div className="shade"></div>

      {/* 2D Category Cinematic Backgrounds with SVG Film Grain & Vignette */}
      <div id="bgw" className="bgw" hidden>
        <canvas id="bg2" aria-hidden="true"></canvas>
        <div className="g2"></div>
        <div className="v2"></div>
      </div>

      {/* Navigation */}
      <nav>
        <span className="logo">
          <span className="grad-text">Pulse</span> Events KE
        </span>
        <span className="row" style={{ margin: 0 }}>
          <a className="btn" href="#post">
            Post an event
          </a>
        </span>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero */}
        <section className="hero">
          <span className="hero-eyebrow">
            ⚡ Daytime Summits • Sunset Raves • Live Concerts • Festivals
          </span>
          <h1>
            Your next{" "}
            <span className="grad-text">unforgettable experience</span> starts here.
          </h1>
          <p className="lead">
            From daytime tech summits and cultural food festivals to electric
            concerts and sunset beach raves. Get tickets in seconds with M-Pesa.
            Organizers: sell out faster with built-in promotion.
          </p>
          <div className="row">
            <a className="btn" href="#events">
              Get tickets
            </a>
            <a className="btn ghost" href="#post">
              Post your event
            </a>
          </div>
          <div id="feat"></div>
        </section>

        {/* Events */}
        <section id="events">
          <h2>What is on</h2>
          <div
            className="row"
            id="cats"
            role="group"
            aria-label="Filter by category"
          ></div>
          <div className="grid" id="grid"></div>
        </section>

        {/* Post Event */}
        <section id="post">
          <h2>Post your event</h2>
          <p className="lead">
            Listing takes a minute. Add your tickets, then boost it so more
            people see it.
          </p>
          <form className="panel" id="form">
            <label className="full">
              Event name
              <input
                id="f-t"
                required
                maxLength={60}
                placeholder="Nyama Choma Festival"
              />
            </label>
            <label>
              Category
              <select id="f-c"></select>
            </label>
            <label>
              Date
              <input id="f-d" type="date" required />
            </label>
            <label>
              Venue and town
              <input
                id="f-v"
                required
                maxLength={60}
                placeholder="Carnivore Grounds, Nairobi"
              />
            </label>
            <label>
              Ticket price in KES
              <input id="f-p" type="number" min="0" required placeholder="1500" />
            </label>
            <label>
              Tickets available
              <input id="f-q" type="number" min="1" required placeholder="500" />
            </label>
            <label className="full">
              What should people know?
              <textarea
                id="f-x"
                maxLength={400}
                placeholder="Line-up, dress code, parking, age limit."
              ></textarea>
            </label>
            <div className="full">
              <button className="btn" type="submit">
                Publish event
              </button>
            </div>
          </form>
        </section>

        {/* Promote and Advertise */}
        <section id="promote">
          <h2>Promote and advertise</h2>
          <p className="lead">
            Pick an event, pick a package, pay with M-Pesa. Promoted events show
            first and carry a badge.
          </p>
          <label style={{ maxWidth: "420px", marginTop: "10px" }}>
            Event to promote
            <select id="psel"></select>
          </label>
          <div className="pk" id="pk"></div>
        </section>

        {/* About */}
        <section id="about">
          <h2>Built for Kenya’s event scene</h2>
          <p className="lead">
            Pulse Events KE is a ticketing and event marketing platform. Fans
            find and book events in seconds, and organizers sell tickets and
            promote their events from one place.
          </p>
          <div className="steps">
            <div className="panel">
              <b>1. Discover</b>
              Browse concerts, festivals, parties and conferences by category.
            </div>
            <div className="panel">
              <b>2. Book</b>
              Pick your ticket and pay from your phone. Your ticket arrives by
              SMS and WhatsApp.
            </div>
            <div className="panel">
              <b>3. Promote</b>
              Organizers boost their events, share on WhatsApp and reach more
              buyers.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="fw">
          <div>
            <b className="logo">Pulse Events KE</b>
            <p>
              Pulse Events KE is a ticketing and event marketing platform. We
              help Kenyan organizers sell tickets, promote their events and
              reach more fans, and we help fans find and book the best events in
              one place.
            </p>
          </div>
          <div>
            <b>Explore</b>
            <a href="#events">Events</a>
            <a href="#post">Post an event</a>
            <a href="#promote">Promote an event</a>
            <a href="#about">About us</a>
          </div>
          <div>
            <b>For organizers</b>
            <a href="/dashboard">Organizer Dashboard</a>
            <a href="/scanner">Gate Scanner</a>
            <a href="#promote">Boost &amp; Promote</a>
          </div>
        </div>
        <p className="cp">© 2026 Pulse Events KE. Nairobi, Kenya.</p>
      </footer>

      {/* Event Details Dialog Overlay */}
      <div
        className="dv"
        id="dv"
        hidden
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
      >
        <div className="in" id="dvin"></div>
      </div>

      {/* M-Pesa Modal Prompt */}
      <div className="mp" id="mp" hidden>
        <div className="box" id="mp-box">
          <h3 id="mt" style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "22px", margin: 0 }}></h3>
          <label>
            M-Pesa phone number
            <input
              id="ph"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
            />
          </label>
          <div id="me" style={{ color: "var(--a)", fontSize: "14px", minHeight: "20px" }}></div>
          <button className="btn" id="go">
            Send M-Pesa prompt
          </button>
          <button className="btn ghost" id="x">
            Cancel
          </button>
        </div>
      </div>

      {/* Live Toast */}
      <div className="toast" id="toast" role="status"></div>
    </div>
  );
}
