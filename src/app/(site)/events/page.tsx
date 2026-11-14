"use client";

import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import EventsSection from "@/components/events/EventsSection";

export default function EventsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <EventsSection />
      </main>
      <Footer />
    </>
  );
}
