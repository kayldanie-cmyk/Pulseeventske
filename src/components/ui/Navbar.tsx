"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Events", href: "#events" },
  { label: "Post", href: "#post" },
  { label: "Promote", href: "#promote" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/85 border-b border-[var(--line)]"
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "Syne" }}>
            <span className="bg-gradient-to-r from-[var(--a)] to-[var(--b)] bg-clip-text text-transparent">
              Pulse
            </span>{" "}
            <span className="text-[var(--ink)]">Events KE</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[var(--mute)] hover:text-[var(--ink)] text-sm font-medium transition-colors no-underline"
            >
              {link.label}
            </a>
          ))}
          <a href="#post" className="btn-gradient text-sm !py-2 !px-5">
            Post an event
          </a>
        </div>

        {/* Mobile toggle button (min 44x44px touch target) */}
        <button
          className="md:hidden text-[var(--ink)] text-2xl w-11 h-11 flex items-center justify-center bg-transparent border-none cursor-pointer rounded-lg hover:bg-white/5 active:scale-95 transition"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {open && (
        <div className="md:hidden border-t border-[var(--line)] bg-[var(--bg)] px-6 pb-6 pt-4 flex flex-col gap-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[var(--mute)] hover:text-[var(--ink)] text-base font-medium py-2 no-underline active:text-[var(--a)]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#post"
            className="btn-gradient text-sm text-center py-3"
            onClick={() => setOpen(false)}
          >
            Post an event
          </a>
        </div>
      )}
    </nav>
  );
}
