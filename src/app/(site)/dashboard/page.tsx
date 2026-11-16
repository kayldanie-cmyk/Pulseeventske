"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { formatKES } from "@/lib/format";

interface AttendeeRow {
  id: string;
  code: string;
  name: string;
  phone: string;
  event: string;
  tier: string;
  amount: number;
  receipt: string;
  status: "valid" | "used";
  date: string;
}

const SAMPLE_ATTENDEES: AttendeeRow[] = [
  {
    id: "att-1",
    code: "TKT-B4A19F",
    name: "Faith Wanjiru",
    phone: "254712****45",
    event: "PULSE Nairobi Festival",
    tier: "VIP Front Row",
    amount: 9500,
    receipt: "SG758291KE",
    status: "used",
    date: "14 Nov, 16:32",
  },
  {
    id: "att-2",
    code: "TKT-C8D32E",
    name: "Brian Otieno",
    phone: "254722****81",
    event: "PULSE Nairobi Festival",
    tier: "3-Day Pass",
    amount: 3500,
    receipt: "SG758112KE",
    status: "valid",
    date: "14 Nov, 15:40",
  },
  {
    id: "att-3",
    code: "TKT-7F02A4",
    name: "Amina Mohamed",
    phone: "254701****19",
    event: "Diani Sunset Beach Rave",
    tier: "Regular",
    amount: 1800,
    receipt: "SG757940KE",
    status: "valid",
    date: "14 Nov, 14:15",
  },
  {
    id: "att-4",
    code: "TKT-E192B8",
    name: "Kevin Kiprop",
    phone: "254790****33",
    event: "Savanna Dev and AI Summit",
    tier: "Pro with workshops",
    amount: 6000,
    receipt: "SG757421KE",
    status: "used",
    date: "14 Nov, 13:05",
  },
  {
    id: "att-5",
    code: "TKT-31A88C",
    name: "Grace Njeri",
    phone: "254741****90",
    event: "PULSE Nairobi Festival",
    tier: "Saturday",
    amount: 1500,
    receipt: "SG756890KE",
    status: "valid",
    date: "14 Nov, 11:22",
  },
];

export default function OrganizerDashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeRow[]>(SAMPLE_ATTENDEES);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchEvent = selectedEvent === "All" || a.event === selectedEvent;
      const matchSearch =
        a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.receipt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.tier.toLowerCase().includes(searchQuery.toLowerCase());
      return matchEvent && matchSearch;
    });
  }, [attendees, selectedEvent, searchQuery]);

  const totalGross = useMemo(() => {
    return filteredAttendees.reduce((sum, a) => sum + a.amount, 0);
  }, [filteredAttendees]);

  const checkedInCount = useMemo(() => {
    return filteredAttendees.filter((a) => a.status === "used").length;
  }, [filteredAttendees]);

  const exportCSV = () => {
    const headers = ["Ticket Code", "Name", "Phone", "Event", "Tier", "Amount (KES)", "M-Pesa Receipt", "Status", "Date"];
    const rows = filteredAttendees.map((a) => [
      a.code,
      `"${a.name}"`,
      a.phone,
      `"${a.event}"`,
      `"${a.tier}"`,
      a.amount,
      a.receipt,
      a.status,
      `"${a.date}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pulse_attendees_${selectedEvent.toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 sm:pt-28 pb-20 min-h-screen px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--a)] bg-[var(--card)] border border-[var(--line)] px-3 py-1 rounded-full mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Organizer Command Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ fontFamily: "Syne" }}>
              Sales & Gate Analytics
            </h1>
            <p className="text-sm text-[var(--mute)]">
              Real-time ticket issuance, M-Pesa settlements, and gate check-in status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/scanner" className="btn text-sm">
              📷 Open Gate Scanner
            </Link>
            <button onClick={exportCSV} className="btn ghost text-sm">
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Event Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["All", "PULSE Nairobi Festival", "Savanna Dev and AI Summit", "Diani Sunset Beach Rave"].map(
            (evt) => (
              <button
                key={evt}
                onClick={() => setSelectedEvent(evt)}
                className={`chip !text-xs !py-1.5 !px-4 transition-all ${
                  selectedEvent === evt ? "!bg-[var(--a)] !text-[var(--bg)] font-bold" : ""
                }`}
              >
                {evt}
              </button>
            )
          )}
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="panel !p-5">
            <span className="text-xs uppercase tracking-wider text-[var(--mute)]">Gross Ticket Revenue</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-2" style={{ fontFamily: "Syne" }}>
              {formatKES(totalGross || 22300)}
            </div>
            <span className="text-xs text-emerald-400 mt-1 inline-block">↑ +18.4% this week</span>
          </div>

          <div className="panel !p-5">
            <span className="text-xs uppercase tracking-wider text-[var(--mute)]">Tickets Sold</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-2" style={{ fontFamily: "Syne" }}>
              {filteredAttendees.length} <span className="text-xs font-normal text-[var(--mute)]">passes</span>
            </div>
            <div className="w-full bg-[var(--bg)] h-2 rounded-full mt-3 overflow-hidden border border-[var(--line)]">
              <div className="bg-[var(--a)] h-full rounded-full" style={{ width: "74%" }}></div>
            </div>
          </div>

          <div className="panel !p-5">
            <span className="text-xs uppercase tracking-wider text-[var(--mute)]">Gate Check-In Velocity</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-2" style={{ fontFamily: "Syne" }}>
              {checkedInCount} / {filteredAttendees.length}
            </div>
            <span className="text-xs text-[var(--mute)] mt-1 inline-block">
              {Math.round((checkedInCount / Math.max(1, filteredAttendees.length)) * 100)}% attendees admitted
            </span>
          </div>

          <div className="panel !p-5">
            <span className="text-xs uppercase tracking-wider text-[var(--mute)]">Promotion ROI</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-2" style={{ fontFamily: "Syne" }}>
              3.8x
            </div>
            <span className="text-xs text-[var(--a)] mt-1 inline-block">Spotlight & Boost active</span>
          </div>
        </div>

        {/* Tier Performance & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tiers Breakdown */}
          <div className="panel lg:col-span-1">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "Syne" }}>
              Tier Capacity Breakdown
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <b>VIP Front Row</b>
                  <span>12 left / 50 sold</span>
                </div>
                <div className="w-full bg-[var(--bg)] h-2 rounded-full overflow-hidden border border-[var(--line)]">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "80%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <b>3-Day Festival Pass</b>
                  <span>86 left / 300 sold</span>
                </div>
                <div className="w-full bg-[var(--bg)] h-2 rounded-full overflow-hidden border border-[var(--line)]">
                  <div className="bg-[var(--a)] h-full rounded-full" style={{ width: "77%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <b>Saturday Regular</b>
                  <span>240 left / 1,200 sold</span>
                </div>
                <div className="w-full bg-[var(--bg)] h-2 rounded-full overflow-hidden border border-[var(--line)]">
                  <div className="bg-teal-400 h-full rounded-full" style={{ width: "83%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendee Ledger */}
          <div className="panel lg:col-span-2 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: "Syne" }}>
                Recent Ticket Transactions
              </h3>
              <input
                type="text"
                placeholder="Search ticket code, phone, receipt…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--a)] max-w-xs"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[var(--mute)]">
                    <th className="py-2.5 px-3">Ticket</th>
                    <th className="py-2.5 px-3">Attendee</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Receipt</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]/50">
                  {filteredAttendees.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-[var(--a)]">
                        {a.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[var(--ink)]">{a.name}</div>
                        <div className="text-[10px] text-[var(--mute)]">{a.phone}</div>
                      </td>
                      <td className="py-3 px-3 text-[var(--mute)]">{a.tier}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--ink)]">
                        KES {a.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--mute)]">{a.receipt}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            a.status === "used"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-teal-950 text-teal-300 border border-teal-800"
                          }`}
                        >
                          {a.status === "used" ? "Admitted" : "Active"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/tickets/${a.code}`}
                          className="text-[var(--a)] hover:underline font-medium"
                        >
                          View Pass →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
