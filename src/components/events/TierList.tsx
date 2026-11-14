import { formatKES } from "@/lib/format";

interface Tier {
  name: string;
  price: number;
  perks: string[];
}

interface TierListProps {
  tiers: Tier[];
}

const DEFAULT_TIERS: Tier[] = [
  { name: "Regular", price: 1500, perks: ["General admission", "Access to main stage"] },
  { name: "VIP", price: 5000, perks: ["Priority entry", "VIP lounge", "Complimentary drink"] },
  { name: "VVIP", price: 10000, perks: ["All VIP perks", "Backstage access", "Meet & greet"] },
];

export default function TierList({ tiers = DEFAULT_TIERS }: TierListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {tiers.map((tier) => (
        <div
          key={tier.name}
          className="card p-5 sm:p-6 flex flex-col gap-4 text-center justify-between"
        >
          <div>
            <h3 className="text-sm uppercase tracking-wider text-[var(--mute)] font-semibold mb-1">
              {tier.name}
            </h3>
            <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[var(--a)] to-[var(--b)] bg-clip-text text-transparent mb-3">
              {formatKES(tier.price)}
            </p>
            <ul className="text-sm text-[var(--mute)] space-y-1.5 list-none p-0 text-left">
              {tier.perks.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="text-[var(--a)] font-bold">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <a
            href="#mpesa-phone"
            className="btn-gradient text-sm mt-3 w-full text-center"
          >
            Select &amp; Pay
          </a>
        </div>
      ))}
    </div>
  );
}
