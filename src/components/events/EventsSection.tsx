"use client";

import { useState } from "react";
import EventCard from "./EventCard";
import { SEED_EVENTS, CATEGORIES } from "./data";

export default function EventsSection() {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All"
      ? SEED_EVENTS
      : SEED_EVENTS.filter((e) => e.category === active);

  return (
    <section id="events" className="section">
      <h2
        className="text-3xl md:text-4xl font-extrabold text-center mb-2"
        style={{ fontFamily: "Syne" }}
      >
        What is on
      </h2>
      <p className="text-center text-[var(--mute)] mb-8 max-w-lg mx-auto text-sm sm:text-base">
        Browse upcoming events across Kenya — concerts, festivals, tech conferences, and beach raves.
      </p>

      {/* Category filter chips */}
      <div
        className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10 px-2"
        role="group"
        aria-label="Filter events by category"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`chip ${active === cat ? "active" : ""}`}
            onClick={() => setActive(cat)}
            aria-pressed={active === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {filtered.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-8 text-center text-[var(--mute)] mt-10 max-w-md mx-auto">
          No events found in this category yet. Be the first to post one!
        </div>
      )}
    </section>
  );
}
