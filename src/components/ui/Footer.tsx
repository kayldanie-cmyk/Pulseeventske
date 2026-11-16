import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--card)]">
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Col 1 — Brand */}
        <div>
          <h3
            className="text-lg font-extrabold mb-3"
            style={{ fontFamily: "Syne" }}
          >
            <span className="bg-gradient-to-r from-[var(--a)] to-[var(--b)] bg-clip-text text-transparent">
              Pulse
            </span>{" "}
            Events KE
          </h3>
          <p className="text-sm text-[var(--mute)] leading-relaxed">
            Kenya&apos;s freshest event platform — discover, buy tickets, and
            promote unforgettable experiences.
          </p>
        </div>

        {/* Col 2 — Links */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--ink)] mb-3 uppercase tracking-wider">
            Explore &amp; Organize
          </h4>
          <ul className="space-y-2 list-none p-0 text-sm">
            <li>
              <Link
                href="/#events"
                className="text-[var(--mute)] hover:text-[var(--a)] transition-colors no-underline"
              >
                Explore Events
              </Link>
            </li>
            <li>
              <Link
                href="/#post"
                className="text-[var(--mute)] hover:text-[var(--a)] transition-colors no-underline"
              >
                Post an Event
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard"
                className="text-[var(--mute)] hover:text-[var(--a)] transition-colors no-underline"
              >
                Organizer Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/scanner"
                className="text-[var(--mute)] hover:text-[var(--a)] transition-colors no-underline"
              >
                Gate Scanner Terminal
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3 — Contact */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--ink)] mb-3 uppercase tracking-wider">
            Get in Touch
          </h4>
          <p className="text-sm text-[var(--mute)] leading-relaxed">
            hello@pulseevents.ke
            <br />
            Nairobi, Kenya
          </p>
          <div className="flex gap-4 mt-4">
            {["X", "IG", "TK"].map((s) => (
              <span
                key={s}
                className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center text-xs text-[var(--mute)] hover:border-[var(--a)] hover:text-[var(--a)] transition-colors cursor-pointer"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] text-center py-6 text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} Pulse Events KE. All rights reserved.
      </div>
    </footer>
  );
}
