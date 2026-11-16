import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import TierList from "@/components/events/TierList";
import MpesaDialog from "@/components/checkout/MpesaDialog";
import { SEED_EVENTS } from "@/components/events/data";
import { formatKES, formatDate, formatDateRange } from "@/lib/format";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = SEED_EVENTS.find((e) => e.id === id);
  if (!event) return { title: "Event Not Found | Pulse Events KE" };

  return {
    title: `${event.title} - Tickets & Info | Pulse Events KE`,
    description: event.description,
    openGraph: {
      title: `${event.title} | Pulse Events KE`,
      description: event.description,
      type: "website",
      locale: "en_KE",
      url: `https://pulseevents.co.ke/events/${event.id}`,
      siteName: "Pulse Events KE",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.description,
    },
  };
}

export async function generateStaticParams() {
  return SEED_EVENTS.map((event) => ({
    id: event.id,
  }));
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = SEED_EVENTS.find((e) => e.id === id);

  if (!event) {
    notFound();
  }

  const hueRotation = `${Math.round(event.hue * 360)}deg`;
  const dateLabel =
    event.dateEnd && event.dateEnd !== event.dateStart
      ? formatDateRange(event.dateStart, event.dateEnd)
      : formatDate(event.dateStart);

  const shareText = encodeURIComponent(
    `Check out ${event.title} in Kenya (${dateLabel} at ${event.venue}) on Pulse Events KE!`
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.dateStart,
    endDate: event.dateEnd || event.dateStart,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.venue.includes("Diani") ? "Diani" : "Nairobi",
        addressCountry: "KE",
      },
    },
    offers: {
      "@type": "Offer",
      url: `https://pulseevents.co.ke/events/${event.id}`,
      price: event.price,
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01T00:00:00+03:00",
    },
    organizer: {
      "@type": "Organization",
      name: "Pulse Events KE",
      url: "https://pulseevents.co.ke",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="pt-20 sm:pt-24 pb-16 min-h-screen px-4 sm:px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Back button */}
          <Link
            href="/#events"
            className="inline-flex items-center gap-2 text-sm text-[var(--mute)] hover:text-[var(--ink)] mb-6 no-underline transition-colors py-2"
          >
            ← Back to events
          </Link>

          {/* Hero Banner */}
          <div
            className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 mb-8 relative overflow-hidden border border-[var(--line)] shadow-xl"
            style={{
              background: `linear-gradient(135deg, hsl(${hueRotation} 70% 25%), hsl(${hueRotation} 50% 8%))`,
            }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="chip !text-xs !min-h-0 !py-1 !px-3 bg-[var(--bg)]/50 backdrop-blur-sm border-white/20 text-white">
                {event.category}
              </span>
              {event.promoted && (
                <span className="bg-gradient-to-r from-[var(--a)] to-[var(--b)] text-[var(--bg)] text-xs font-bold px-3 py-1 rounded-full">
                  ★ Promoted
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              {event.title}
            </h1>

            <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-[var(--mute)] mb-6">
              <span>📍 {event.venue}</span>
              <span>📅 {dateLabel}</span>
              <span className="text-[var(--ink)] font-semibold">
                From {formatKES(event.price)}
              </span>
            </div>

            <p className="text-sm sm:text-base md:text-lg text-[var(--ink)]/90 max-w-2xl leading-relaxed mb-6">
              {event.description}
            </p>

            {/* Share action */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-xs sm:text-sm !py-2 !px-4"
              >
                💬 Share on WhatsApp
              </a>
            </div>
          </div>

          {/* Ticket Tiers */}
          <section className="mb-10 sm:mb-12">
            <h2 className="text-2xl font-bold mb-5" style={{ fontFamily: "Syne" }}>
              Select Tickets
            </h2>
            <TierList
              tiers={[
                {
                  name: "Regular",
                  price: event.price,
                  perks: ["General admission", "Standard entry", "Access to main grounds"],
                },
                {
                  name: "VIP",
                  price: event.price * 2.5,
                  perks: ["Priority fast-track entry", "VIP lounge access", "Welcome drink included"],
                },
                {
                  name: "VVIP / Table",
                  price: event.price * 5,
                  perks: [
                    "Dedicated table service",
                    "Backstage pass",
                    "Premium bottle service",
                    "Reserved parking",
                  ],
                },
              ]}
            />
          </section>

          {/* M-Pesa Checkout */}
          <section className="mb-10 sm:mb-12">
            <MpesaDialog />
          </section>

          {/* FAQs */}
          <section className="card p-6 sm:p-8 mb-10">
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "Syne" }}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-4 text-sm text-[var(--mute)]">
              <div>
                <h3 className="font-semibold text-[var(--ink)] mb-1">
                  How do I receive my ticket?
                </h3>
                <p>
                  Instantly by SMS and WhatsApp right after your M-Pesa payment is confirmed.
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--line)]">
                <h3 className="font-semibold text-[var(--ink)] mb-1">
                  Can I transfer my ticket?
                </h3>
                <p>
                  Yes, ticket transfers are supported directly through Pulse Events KE.
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--line)]">
                <h3 className="font-semibold text-[var(--ink)] mb-1">
                  What if the event is rescheduled?
                </h3>
                <p>
                  Your ticket remains valid for the new date, or you can claim a 100% refund through M-Pesa.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
