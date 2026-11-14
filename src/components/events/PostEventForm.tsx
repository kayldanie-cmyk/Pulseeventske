"use client";

import { useState } from "react";

export default function PostEventForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }, 800);
  };

  return (
    <form className="card p-6 md:p-8 flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
            Event Name
          </label>
          <input
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Nyama Choma Festival"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
            Venue &amp; Town
          </label>
          <input
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Carnivore Grounds, Nairobi"
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
            Date
          </label>
          <input
            type="date"
            required
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
            Category
          </label>
          <select
            required
            defaultValue=""
            className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors cursor-pointer"
          >
            <option value="" disabled>
              Select category
            </option>
            <option value="Music">Music</option>
            <option value="Conference">Conference</option>
            <option value="Nightlife">Nightlife</option>
            <option value="Sports">Sports</option>
            <option value="Comedy">Comedy</option>
            <option value="Food and culture">Food and culture</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
          What should people know?
        </label>
        <textarea
          placeholder="Line-up, schedule, dress code, parking, age limit…"
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] resize-y transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--mute)] mb-2">
          Contact Email
        </label>
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="organizer@events.ke"
          className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] transition-colors"
        />
      </div>

      <button
        type="submit"
        className="btn-gradient self-center md:self-start text-base py-3.5 px-8"
        disabled={loading}
      >
        {loading ? "Publishing…" : "Publish Event"}
      </button>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-sm text-center">
          ✓ Event listed successfully! Boost it in the section below to reach more fans.
        </div>
      )}
    </form>
  );
}
