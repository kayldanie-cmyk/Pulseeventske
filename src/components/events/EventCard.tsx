import Link from "next/link";
import type { SeedEvent } from "./data";
import { formatKES, formatDate, formatDateRange } from "@/lib/format";

interface EventCardProps {
  event: SeedEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const hueRotation = `${Math.round(event.hue * 360)}deg`;
  const dateLabel =
    event.dateEnd && event.dateEnd !== event.dateStart
      ? formatDateRange(event.dateStart, event.dateEnd)
      : formatDate(event.dateStart);

  return (
    <article className="card group relative flex flex-col h-full">
      {/* Banner */}
      <div
        className="h-44 sm:h-48 relative overflow-hidden flex items-end p-4"
        style={{
          background: `linear-gradient(135deg, hsl(${hueRotation} 70% 30%), hsl(${hueRotation} 60% 12%))`,
        }}
      >
        {event.promoted && (
          <span className="absolute top-3 right-3 bg-gradient-to-r from-[var(--a)] to-[var(--b)] text-[var(--bg)] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            ★ Promoted
          </span>
        )}
        <span className="chip !text-xs !min-h-0 !py-1 !px-2.5 bg-[var(--bg)]/50 backdrop-blur-sm border-white/20 text-white">
          {event.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow gap-2">
        <h3
          className="text-lg font-bold text-[var(--ink)] leading-snug"
          style={{ fontFamily: "Syne" }}
        >
          {event.title}
        </h3>
        <p className="text-sm text-[var(--mute)] line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="flex items-end justify-between mt-auto pt-3 border-t border-[var(--line)]">
          <div className="text-xs text-[var(--mute)] space-y-0.5">
            <div className="truncate max-w-[180px]">📍 {event.venue}</div>
            <div>📅 {dateLabel}</div>
          </div>
          <span className="text-base font-extrabold bg-gradient-to-r from-[var(--a)] to-[var(--b)] bg-clip-text text-transparent whitespace-nowrap">
            {formatKES(event.price)}
          </span>
        </div>

        <Link
          href={`/events/${event.id}`}
          className="btn-gradient text-sm mt-3 w-full text-center"
        >
          Get Tickets
        </Link>
      </div>
    </article>
  );
}
