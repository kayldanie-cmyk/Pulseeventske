"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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

    /* ── 2D Cinematic Backgrounds ── */
    const BG = (() => {
      const bgw = $("#bgw")!;
      const c = $("#bg2") as HTMLCanvasElement;
      if (!c) return { on() {}, off() {}, isOpen() { return false; }, lite() { return false; }, isLite() { return false; } };

      const x = c.getContext("2d")!;
      let W = window.innerWidth;
      let H = window.innerHeight;
      let T = 0;
      let sp = 0;
      let open = false;
      let run = false;
      let scn = "conf";
      let lite = false;
      const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;

      const SCN: Record<string, string> = {
        Music: "fest",
        Sports: "fest",
        Comedy: "fest",
        Conference: "conf",
        Nightlife: "beach",
        "Food and culture": "beach",
        Other: "conf",
      };

      const rn = (n: number) => Math.random() * n;
      const mxc = (a: number[], b: number[], t: number) =>
        a.map((v, i) => Math.round(v + (b[i] - v) * t));

      function sz() {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        c.width = W * d;
        c.height = H * d;
        x.setTransform(d, 0, 0, d, 0, 0);
      }
      window.addEventListener("resize", sz);
      sz();

      const dust: Array<{ x: number; y: number; s: number; v: number }> = [];
      const nodes: Array<{ x: number; y: number; vx: number; vy: number }> = [];
      const stars: Array<{ x: number; y: number; s: number; p: number }> = [];
      const lant: Array<{ x: number; y: number; s: number; v: number; p: number }> = [];
      const crowd: Array<{ x: number; r: number; p: number; arm: boolean }> = [];

      for (let i = 0; i < 110; i++) dust.push({ x: rn(1), y: rn(1), s: rn(1.8) + 0.4, v: rn(0.05) + 0.02 });
      for (let i = 0; i < 70; i++) nodes.push({ x: rn(1), y: rn(1), vx: (rn(1) - 0.5) * 0.0004, vy: (rn(1) - 0.5) * 0.0004 });
      for (let i = 0; i < 140; i++) stars.push({ x: rn(1), y: rn(0.6), s: rn(1.5) + 0.3, p: rn(6) });
      for (let i = 0; i < 16; i++) lant.push({ x: rn(1), y: rn(1), s: rn(8) + 5, v: rn(0.03) + 0.01, p: rn(6) });
      for (let i = 0; i < 70; i++) crowd.push({ x: i / 69, r: 9 + rn(6), p: rn(6), arm: rn(1) > 0.6 });

      function grad(s: Array<[number, string]>) {
        const g = x.createLinearGradient(0, 0, 0, H);
        s.forEach((a) => g.addColorStop(a[0], a[1]));
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
      }

      function motes(col: string, n: number) {
        x.fillStyle = col;
        for (let i = 0; i < n; i++) {
          const d = dust[i];
          d.y -= d.v * 0.003;
          if (d.y < 0) d.y = 1;
          x.globalAlpha = 0.5;
          x.beginPath();
          x.arc(d.x * W + Math.sin(T + d.s * 9) * 12, d.y * H, d.s, 0, 6.3);
          x.fill();
        }
        x.globalAlpha = 1;
      }

      const SC: Record<string, () => void> = {
        fest() {
          grad([
            [0, "#07020f"],
            [0.7, "#2a0a22"],
            [1, "#12030f"],
          ]);
          const sy = H * 0.66;
          x.globalCompositeOperation = "lighter";
          for (let i = 0; i < 9; i++) {
            const sx = W * (0.12 + (0.76 * i) / 8);
            const a = -Math.PI / 2 + Math.sin(T * 0.9 + i * 0.8) * 0.75;
            const w = 0.035;
            const L = H * 1.3;
            x.fillStyle = `hsla(${(i * 40 + T * 30) % 360},100%,60%,.16)`;
            x.beginPath();
            x.moveTo(sx, sy);
            x.lineTo(sx + Math.cos(a - w) * L, sy + Math.sin(a - w) * L);
            x.lineTo(sx + Math.cos(a + w) * L, sy + Math.sin(a + w) * L);
            x.fill();
          }
          x.globalCompositeOperation = "source-over";
          motes("#ffd9a0", 70);
          x.fillStyle = "#06020a";
          x.fillRect(W * 0.08, sy, W * 0.84, H * 0.12);
          x.fillStyle = "rgba(255,90,60,.8)";
          x.fillRect(W * 0.08, sy, W * 0.84, 3);
          x.fillStyle = "#030107";
          crowd.forEach((c) => {
            const px = c.x * W;
            const py = H * 0.9 + Math.sin(T * 3 + c.p) * 5 - ((c.x * 7) % 3) * 8;
            x.beginPath();
            x.arc(px, py, c.r, 0, 6.3);
            x.fill();
            x.fillRect(px - c.r * 1.3, py + c.r * 0.6, c.r * 2.6, H);
            if (c.arm) {
              x.fillRect(
                px + c.r * 0.8,
                py - c.r * 2.2 + Math.sin(T * 4 + c.p) * 6,
                3,
                c.r * 2.4
              );
            }
          });
        },
        conf() {
          grad([
            [0, "#030a1c"],
            [1, "#082544"],
          ]);
          const sx = W * (0.5 + 0.3 * Math.sin(T * 0.4));
          x.fillStyle = "rgba(130,200,255,.07)";
          x.beginPath();
          x.moveTo(sx, 0);
          x.lineTo(sx - W * 0.18, H);
          x.lineTo(sx + W * 0.18, H);
          x.fill();
          nodes.forEach((n) => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > 1) n.vx *= -1;
            if (n.y < 0 || n.y > 1) n.vy *= -1;
          });
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = nodes[i];
              const b = nodes[j];
              const d = Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
              if (d < 150) {
                x.strokeStyle = `rgba(120,210,255,${0.4 * (1 - d / 150)})`;
                x.beginPath();
                x.moveTo(a.x * W, a.y * H);
                x.lineTo(b.x * W, b.y * H);
                x.stroke();
              }
            }
          }
          nodes.forEach((n, i) => {
            x.fillStyle = i % 9 ? "#9fe3ff" : "#ffd166";
            x.beginPath();
            x.arc(n.x * W, n.y * H, i % 9 ? 2.2 : 4, 0, 6.3);
            x.fill();
          });
          motes("#8fd0ff", 30);
        },
        beach() {
          const p = Math.min(1, sp);
          const t1 = mxc([255, 122, 61], [5, 6, 26], p);
          const t2 = mxc([122, 42, 106], [11, 16, 48], p);
          const t3 = mxc([27, 20, 64], [16, 26, 58], p);
          const q = (a: number[]) => `rgb(${a.join(",")})`;
          grad([
            [0, q(t3)],
            [0.55, q(t2)],
            [0.75, q(t1)],
            [1, q(t2)],
          ]);
          stars.forEach((s) => {
            x.globalAlpha = p * (0.5 + 0.5 * Math.sin(T * 2 + s.p));
            x.fillStyle = "#fff";
            x.fillRect(s.x * W, s.y * H, s.s, s.s);
          });
          x.globalAlpha = 1;
          const sy = H * (0.55 + 0.25 * p);
          const g = x.createRadialGradient(W * 0.5, sy, 0, W * 0.5, sy, H * 0.3);
          g.addColorStop(0, `rgba(255,200,120,${0.9 - 0.8 * p})`);
          g.addColorStop(1, "transparent");
          x.fillStyle = g;
          x.fillRect(0, 0, W, H);
          for (let k = 0; k < 4; k++) {
            x.fillStyle = `hsl(${215 + k * 4},${55 - k * 5}%,${Math.max(
              4,
              22 - k * 4 - p * 12
            )}%)`;
            x.beginPath();
            x.moveTo(0, H);
            for (let px = 0; px <= W; px += 14) {
              x.lineTo(
                px,
                H * (0.7 + k * 0.055) +
                  Math.sin(px * 0.012 + T * (1 + k * 0.4) + k) * (8 + k * 3)
              );
            }
            x.lineTo(W, H);
            x.fill();
          }
          [
            [0.08, 1],
            [0.93, -1],
          ].forEach((qPair) => {
            const bx = W * qPair[0];
            const tx = bx + qPair[1] * 60;
            const ty = H * 0.5;
            x.lineWidth = 11;
            x.strokeStyle = "#04060d";
            x.beginPath();
            x.moveTo(bx, H);
            x.quadraticCurveTo(bx + qPair[1] * 10, H * 0.7, tx, ty);
            x.stroke();
            x.lineWidth = 4;
            for (let f = 0; f < 7; f++) {
              const a = -Math.PI * (f / 6) + Math.sin(T + f) * 0.05;
              x.beginPath();
              x.moveTo(tx, ty);
              x.quadraticCurveTo(
                tx + Math.cos(a) * 50,
                ty + Math.sin(a) * 60 - 20,
                tx + Math.cos(a) * 95,
                ty + Math.sin(a) * 40 + 45
              );
              x.stroke();
            }
          });
          lant.forEach((l) => {
            l.y -= l.v * 0.003;
            if (l.y < -0.05) l.y = 1.05;
            const lx = l.x * W + Math.sin(T + l.p) * 18;
            const ly = l.y * H;
            x.globalAlpha = 0.25 * (0.4 + p);
            x.fillStyle = "#ffb347";
            x.beginPath();
            x.arc(lx, ly, l.s * 2.2, 0, 6.3);
            x.fill();
            x.globalAlpha = 0.9;
            x.beginPath();
            x.arc(lx, ly, l.s * 0.45, 0, 6.3);
            x.fill();
            x.globalAlpha = 1;
          });
        },
      };

      function loop() {
        if (!open) {
          run = false;
          return;
        }
        T += 0.016;
        if (!(lite || rm) || T < 0.2) SC[scn]?.();
        requestAnimationFrame(loop);
      }

      $("#dv")?.addEventListener(
        "scroll",
        function (this: HTMLElement) {
          sp = this.scrollTop / Math.max(1, this.scrollHeight - this.clientHeight);
        },
        { passive: true }
      );

      return {
        on(e: PulseEvent) {
          scn = SCN[e.cat] || "conf";
          T = 0;
          sp = 0;
          open = true;
          bgw.hidden = false;
          const gl = $("#gl");
          if (gl) gl.style.display = "none";
          if (!run) {
            run = true;
            loop();
          }
        },
        off() {
          open = false;
          run = false;
          bgw.hidden = true;
          const gl = $("#gl");
          if (gl) gl.style.display = "";
        },
        isOpen() {
          return open;
        },
        lite() {
          lite = !lite;
          T = 0;
          return lite;
        },
        isLite() {
          return lite;
        },
      };
    })();

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
        pay(`${e.title}, ${t.n}: KES ${f(t.p)}`, () => {
          t.l--;
          save();
          show();
          toast("Payment received. Your ticket is on its way by SMS and WhatsApp.");
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

    /* ── M-Pesa prompt simulation ── */
    let done: (() => void) | null = null;
    function pay(label: string, cb: () => void) {
      done = cb;
      const mt = $("#mt");
      if (mt) mt.textContent = label;
      const me = $("#me");
      if (me) me.textContent = "";
      const mp = $("#mp");
      if (mp) mp.hidden = false;
      const ph = $("#ph");
      if (ph) ph.focus();
    }

    $("#x")?.addEventListener("click", () => {
      const mp = $("#mp");
      if (mp) mp.hidden = true;
    });

    $("#go")?.addEventListener("click", () => {
      const ph = $("#ph") as HTMLInputElement | null;
      const v = (ph?.value || "").replace(/[\s-]/g, "");
      const me = $("#me");
      if (!/^(\+?254|0)?[17]\d{8}$/.test(v)) {
        if (me) me.textContent = "Enter a valid Safaricom or Airtel number, like 0712 345 678.";
        return;
      }
      const mp = $("#mp");
      if (mp) mp.hidden = true;
      toast(`M-Pesa prompt sent to ${v}. Enter your PIN to confirm.`);
      const c = done;
      setTimeout(() => {
        if (c) c();
      }, 1800);
    });

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
      pay(`${k.n} for ${e.title}: KES ${f(k.p)}`, () => {
        e.promo = Math.max(e.promo, kIndex + 1);
        save();
        render();
        toast(`${e.title} is now promoted.`);
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
            <span>Ticket sales</span>
            <span>Event promotion</span>
            <span>WhatsApp sharing</span>
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
        <div className="box">
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
