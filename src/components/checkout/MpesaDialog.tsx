"use client";

import { useState } from "react";

export default function MpesaDialog() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handlePay = async () => {
    const cleaned = phone.replace(/[\s-]/g, "");
    if (!/^(\+?254|0)?[17]\d{8}$/.test(cleaned)) {
      setErrMsg("Enter a valid Safaricom or Airtel number (e.g. 0712 345 678)");
      return;
    }
    setErrMsg("");
    setLoading(true);
    setStatus("pending");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, amount: 1500 }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrMsg("Payment initiation failed. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrMsg("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 md:p-8 max-w-md mx-auto w-full">
      <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ fontFamily: "Syne" }}>
        Pay with M-Pesa
      </h3>
      <p className="text-sm text-[var(--mute)] mb-5 leading-relaxed">
        Enter your Safaricom or Airtel number to receive an instant STK push prompt on your phone.
      </p>

      <div className="flex flex-col gap-2 mb-4">
        <label htmlFor="mpesa-phone" className="text-xs font-semibold uppercase tracking-wider text-[var(--mute)]">
          M-Pesa Mobile Number
        </label>
        <input
          id="mpesa-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errMsg) setErrMsg("");
          }}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors"
        />
        {errMsg && <span className="text-xs text-red-400 mt-1">{errMsg}</span>}
      </div>

      <button
        className="btn-gradient w-full text-base py-3.5"
        onClick={handlePay}
        disabled={loading || !phone.trim()}
      >
        {loading ? "Sending prompt…" : "Send M-Pesa Prompt"}
      </button>

      {status === "success" && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-sm text-center">
          ✓ STK Push sent! Please enter your M-Pesa PIN on your phone.
        </div>
      )}
      {status === "error" && !errMsg && (
        <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-sm text-center">
          Payment request failed. Please check your phone number and try again.
        </div>
      )}
    </div>
  );
}
