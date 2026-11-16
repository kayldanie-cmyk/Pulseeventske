"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

interface TicketProps {
  params: Promise<{ code: string }>;
}

export default function TicketPassPage({ params }: TicketProps) {
  const { code } = use(params);
  const [copied, setCopied] = useState(false);

  const cleanCode = code ? decodeURIComponent(code).toUpperCase() : "TKT-PULSE";
  const shareText = encodeURIComponent(
    `Here is my Pulse Events KE ticket pass (${cleanCode})! Check it out: https://pulseevents.co.ke/tickets/${cleanCode}`
  );

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-20 min-h-screen px-4 sm:px-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          {/* Top navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="text-xs text-[var(--mute)] hover:text-[var(--ink)] transition-colors inline-flex items-center gap-1"
            >
              ← Back to Pulse Events
            </Link>
            <span className="text-xs text-[var(--a)] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Gate Pass
            </span>
          </div>

          {/* Ticket Card Container */}
          <div className="bg-[#0c1a12] border border-[var(--line)] rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Ticket Header */}
            <div className="p-6 bg-gradient-to-br from-[rgba(16,42,28,0.9)] to-[#09150e] border-b border-[var(--line)]">
              <div className="flex justify-between items-start mb-3">
                <span className="chip !text-[11px] !min-h-0 !py-1 !px-3 font-semibold uppercase tracking-wider text-[var(--a)] border-[var(--line)]">
                  PULSE EVENTS KE
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  ✓ VALID PASS
                </span>
              </div>

              <h1 className="text-2xl font-black leading-tight mb-2" style={{ fontFamily: "Syne" }}>
                PULSE Nairobi Festival
              </h1>
              <p className="text-xs text-[var(--mute)]">
                Dec 26–28, 2026 • Uhuru Gardens, Nairobi
              </p>
            </div>

            {/* Ticket Cutout Circles */}
            <div className="relative h-6 bg-[#0c1a12] flex items-center justify-between px-[-12px]">
              <div className="w-6 h-6 rounded-full bg-[var(--bg)] border-r border-[var(--line)] -ml-3"></div>
              <div className="w-full border-t border-dashed border-[var(--line)] mx-2"></div>
              <div className="w-6 h-6 rounded-full bg-[var(--bg)] border-l border-[var(--line)] -mr-3"></div>
            </div>

            {/* Ticket Body & QR Section */}
            <div className="p-6 pt-2 space-y-6">
              {/* Attendee & Tier Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[var(--mute)] uppercase tracking-wider block text-[10px] mb-1">
                    Pass Type
                  </span>
                  <b className="text-sm text-[var(--ink)]">VIP Front Row</b>
                </div>
                <div>
                  <span className="text-[var(--mute)] uppercase tracking-wider block text-[10px] mb-1">
                    Gate Entry
                  </span>
                  <b className="text-sm text-[var(--ink)]">Gate A (VIP & Media)</b>
                </div>
                <div>
                  <span className="text-[var(--mute)] uppercase tracking-wider block text-[10px] mb-1">
                    Payment Method
                  </span>
                  <b className="text-sm text-emerald-400 font-mono">M-Pesa Verified</b>
                </div>
                <div>
                  <span className="text-[var(--mute)] uppercase tracking-wider block text-[10px] mb-1">
                    Cryptographic Seal
                  </span>
                  <b className="text-sm text-[var(--mute)] font-mono">HMAC-SHA256</b>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center border-4 border-[var(--card)] shadow-inner">
                {/* Simulated high-contrast SVG QR Code Matrix */}
                <svg
                  viewBox="0 0 160 160"
                  className="w-44 h-44 text-black"
                  fill="currentColor"
                  shapeRendering="crispEdges"
                >
                  <rect width="160" height="160" fill="#ffffff" />
                  {/* Top-Left Position Detection Pattern */}
                  <rect x="10" y="10" width="40" height="40" fill="#000000" />
                  <rect x="16" y="16" width="28" height="28" fill="#ffffff" />
                  <rect x="22" y="22" width="16" height="16" fill="#000000" />
                  {/* Top-Right Position Detection Pattern */}
                  <rect x="110" y="10" width="40" height="40" fill="#000000" />
                  <rect x="116" y="16" width="28" height="28" fill="#ffffff" />
                  <rect x="122" y="22" width="16" height="16" fill="#000000" />
                  {/* Bottom-Left Position Detection Pattern */}
                  <rect x="10" y="110" width="40" height="40" fill="#000000" />
                  <rect x="16" y="116" width="28" height="28" fill="#ffffff" />
                  <rect x="22" y="122" width="16" height="16" fill="#000000" />
                  {/* Encoded Data Matrix Dots */}
                  <rect x="60" y="18" width="8" height="8" fill="#000000" />
                  <rect x="76" y="18" width="12" height="8" fill="#000000" />
                  <rect x="64" y="32" width="10" height="10" fill="#000000" />
                  <rect x="84" y="32" width="14" height="6" fill="#000000" />
                  <rect x="20" y="60" width="16" height="8" fill="#000000" />
                  <rect x="44" y="60" width="8" height="8" fill="#000000" />
                  <rect x="60" y="60" width="40" height="8" fill="#000000" />
                  <rect x="110" y="60" width="14" height="8" fill="#000000" />
                  <rect x="132" y="60" width="18" height="8" fill="#000000" />
                  <rect x="64" y="76" width="12" height="12" fill="#000000" />
                  <rect x="84" y="76" width="10" height="14" fill="#000000" />
                  <rect x="102" y="76" width="14" height="8" fill="#000000" />
                  <rect x="24" y="96" width="20" height="6" fill="#000000" />
                  <rect x="60" y="96" width="16" height="12" fill="#000000" />
                  <rect x="88" y="96" width="18" height="8" fill="#000000" />
                  <rect x="114" y="96" width="10" height="12" fill="#000000" />
                  <rect x="132" y="96" width="18" height="6" fill="#000000" />
                  <rect x="60" y="120" width="18" height="8" fill="#000000" />
                  <rect x="86" y="120" width="12" height="12" fill="#000000" />
                  <rect x="108" y="120" width="20" height="8" fill="#000000" />
                  <rect x="68" y="138" width="16" height="12" fill="#000000" />
                  <rect x="94" y="138" width="22" height="10" fill="#000000" />
                  <rect x="126" y="138" width="14" height="12" fill="#000000" />
                </svg>

                {/* Ticket ID Display */}
                <div className="mt-3 text-center">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-medium">
                    Ticket Code
                  </span>
                  <span className="font-mono font-black text-xl text-black tracking-wider">
                    {cleanCode}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleCopy}
                  className="btn text-xs flex-1 text-center justify-center"
                >
                  {copied ? "✓ Copied Code!" : "📋 Copy Ticket Code"}
                </button>
                <a
                  href={`https://wa.me/?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost text-xs flex-1 text-center justify-center"
                >
                  💬 Share on WhatsApp
                </a>
              </div>

              {/* Gate Instructions */}
              <p className="text-[11px] text-[var(--mute)] text-center leading-relaxed">
                Present this digital pass or SMS receipt at the entry gate. The code will be scanned for single-admission entry.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
