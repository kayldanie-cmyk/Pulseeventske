export interface SeedEvent {
  id: string;
  title: string;
  category: string;
  dateStart: string;
  dateEnd?: string;
  venue: string;
  hue: number;
  promoted: boolean;
  price: number;
  image?: string;
  description: string;
}

export const SEED_EVENTS: SeedEvent[] = [
  {
    id: "pulse-nairobi-festival",
    title: "PULSE Nairobi Festival",
    category: "Music",
    dateStart: "2026-12-26",
    dateEnd: "2026-12-28",
    venue: "Uhuru Gardens, Nairobi",
    hue: 0,
    promoted: true,
    price: 2500,
    description:
      "Three days of live music, art, and culture at Nairobi\u2019s iconic Uhuru Gardens. Featuring top Kenyan and East African artists.",
  },
  {
    id: "savanna-dev-ai-summit",
    title: "Savanna Dev & AI Summit",
    category: "Conference",
    dateStart: "2027-02-12",
    dateEnd: "2027-02-12",
    venue: "KICC, Nairobi",
    hue: 0.58,
    promoted: false,
    price: 3000,
    description:
      "East Africa\u2019s premier developer and AI conference. Workshops, keynotes, and networking at KICC.",
  },
  {
    id: "diani-sunset-beach-rave",
    title: "Diani Sunset Beach Rave",
    category: "Nightlife",
    dateStart: "2027-01-02",
    dateEnd: "2027-01-02",
    venue: "Diani Beach, Kwale",
    hue: 0.83,
    promoted: false,
    price: 1500,
    description:
      "Ring in the new year with sun, sand, and bass at Diani Beach. Sunset-to-sunrise vibes on the Kenyan coast.",
  },
];

export const CATEGORIES = ["All", "Music", "Conference", "Nightlife", "Sports", "Arts", "Food"];
