import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#07100b",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Pulse Events KE: tickets and event marketing in Kenya",
  description:
    "Discover, buy tickets, and promote unforgettable events across Kenya — from Nairobi festivals to Diani beach raves.",
  applicationName: "Pulse Events KE",
  authors: [{ name: "Pulse Events KE" }],
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="antialiased overflow-x-hidden min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
