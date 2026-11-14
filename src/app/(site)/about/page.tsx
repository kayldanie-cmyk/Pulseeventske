import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <section className="section">
          <h1
            className="text-3xl md:text-5xl font-extrabold text-center mb-6"
            style={{ fontFamily: "Syne" }}
          >
            About{" "}
            <span className="bg-gradient-to-r from-[var(--a)] to-[var(--b)] bg-clip-text text-transparent">
              Pulse Events KE
            </span>
          </h1>
          <div className="max-w-2xl mx-auto space-y-6 text-[var(--mute)] leading-relaxed">
            <p>
              Pulse Events KE is Kenya&apos;s freshest event discovery and ticketing
              platform. We connect event-goers with the best experiences across
              the country — from Nairobi&apos;s vibrant music scene to the coast&apos;s
              sunset raves and everything in between.
            </p>
            <p>
              Built with love in Nairobi, we make it easy to discover events, buy
              tickets securely via M-Pesa, and promote your events to thousands
              of engaged Kenyans.
            </p>
            <h2
              className="text-2xl font-bold text-[var(--ink)] pt-4"
              style={{ fontFamily: "Syne" }}
            >
              Our Mission
            </h2>
            <p>
              To become East Africa&apos;s go-to platform for event discovery,
              ticketing, and marketing — empowering creators and connecting
              communities through unforgettable experiences.
            </p>
            <h2
              className="text-2xl font-bold text-[var(--ink)] pt-4"
              style={{ fontFamily: "Syne" }}
            >
              Contact Us
            </h2>
            <p>
              📧 hello@pulseevents.ke
              <br />
              📍 Nairobi, Kenya
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
