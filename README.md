# Pulse Events KE ⚡🇰🇪

> **Next-generation ticketing, event marketing, and gate access platform tailored for the Kenyan live event ecosystem.**

Built with **Next.js 15 (App Router)**, **React 19**, **Three.js**, **Tailwind CSS**, **Supabase (PostgreSQL + RLS)**, and **Safaricom Daraja API (M-Pesa STK Push)**.

---

## 🌟 Key Features

### 1. Ultra-Realistic 3D WebGL Visual Experiences
- **Dynamic 3D Tunnel**: Infinite neon-lit cylindrical geometry responding to pointer position on the homepage.
- **Scroll-Reactive 3D Event Detail Modal (`#dv`)**: Three distinct Three.js WebGL procedural scenes replacing traditional static modal backgrounds:
  - 🎸 **Festival Scene** *(Music, Sports, Comedy)*: Volumetric sweeping laser beams (additive blending), oscillating HSL hues, 1,800 haze particles, bobbing silhouette crowd.
  - 🌐 **Conference Scene** *(Conference, Other)*: 48 floating icosahedral holographic data nodes, dynamic Euclidean connection lines (<150px), dual orbital torus rings, sweeping spotlight.
  - 🌅 **Beach Scene** *(Nightlife, Food & Culture)*: 3D procedural ocean plane with compound sine wave displacement, scroll-reactive sunset-to-night celestial descent, palm frond sway animation, floating embers.

### 2. Kenya-Native Commerce (M-Pesa STK Push)
- **Instant Checkout**: Prompts Safaricom subscribers directly on their mobile device via Daraja Express STK push (`processrequest`).
- **Phone Normalization**: Transparently handles Kenyan number formats (`0712...`, `0110...`, `2547...`, `+254...`).
- **Two-Tier Reservation Engine**:
  - **Atomic Database Locks**: PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) in `reserve_tickets()` to prevent overselling high-demand drops.
  - **Graceful Sandbox/Demo Mode**: Built-in in-memory order store and simulated M-Pesa STK push for instant testing without live gateway credentials.
- **Idempotent Webhook Handler**: Secure `/api/mpesa/callback` route logging all transactions to `payment_events`, confirming reservations, and preventing duplicate ticket issuance.

### 3. Offline-First PWA Gate Scanner (`/scanner`)
- **PWA Ready**: Installable to mobile home screen with offline service worker (`public/sw.js`).
- **Offline Ticket Cache**: IndexedDB local storage pre-caches valid ticket hashes for gate scanning in low-connectivity venues (e.g. Carnivore Grounds, Uhuru Gardens, Diani Beach).
- **Camera QR Scanner**: High-speed QR scanning via native `BarcodeDetector` API and `getUserMedia`.
- **Audio-Haptic Feedback**: Web Audio API synthesized tones (rising sine chime for valid entry, square beeps for already used, sawtooth buzz for invalid) with device vibration.
- **Automatic Queue Sync**: Scans performed offline are queued and synced automatically when network connectivity is restored.

### 4. Organizer Analytics Dashboard (`/dashboard`)
- **Revenue Metrics**: Real-time gross ticket volume in Kenyan Shillings (KES).
- **Capacity Funnel**: Tier progress bars tracking sold vs reserved vs remaining capacity.
- **Live Attendee Ledger**: Filterable guest register with instant check-in status toggles.
- **One-Click CSV Export**: Download complete attendee lists for gate manifests or sponsor reporting.

### 5. Ticket Pass & Gate Security (`/tickets/[code]`)
- **Cryptographic Tamper-Proofing**: Tickets verified via HMAC-SHA256 signature generated with server-side secret key.
- **SVG QR Matrix**: Scannable gate access code displaying event details, venue, tier, and M-Pesa receipt reference.
- **One-Click Sharing**: Instant WhatsApp and SMS pass link sharing.

### 6. Automated Order Expiry Cron
- **Vercel Cron Integration** (`vercel.json`): Runs `/api/orders/expire` every minute.
- **Auto-Release Stale Stock**: Orders where buyers do not complete M-Pesa PIN entry within 5 minutes are marked expired, automatically returning reserved tickets to available inventory.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, SSG & Dynamic SSR) |
| **UI Library** | [React 19](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/) |
| **3D & Graphics** | [Three.js r182](https://threejs.org/), WebGL, HTML5 Canvas 2D |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15, Row-Level Security, RPC Functions) |
| **Payment Gateway**| [Safaricom Daraja API](https://developer.safaricom.co.ke/) (Lipa Na M-Pesa Online STK Push) |
| **Messaging** | [Africa's Talking](https://africastalking.com/) (SMS), WhatsApp Click-to-Chat API |
| **PWA & Offline** | Web Service Worker, IndexedDB, Web Audio API, BarcodeDetector API |
| **Deployment** | [Vercel](https://vercel.com/) (Edge Serverless + Vercel Cron) |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/kayldanie-cmyk/Pulseeventske.git
cd pulse-events-ke
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your credentials:
```bash
cp .env.example .env.local
```

### 3. Run Supabase Database Migrations
Run the SQL migration script located at `supabase/migrations/002_production_schema.sql` in your Supabase SQL Editor:
- Creates `profiles`, `events`, `ticket_tiers`, `orders`, `tickets`, and `payment_events` tables.
- Installs atomic stored procedures: `reserve_tickets`, `confirm_reservation`, `release_reservation`, `expire_stale_orders`.
- Enforces Row-Level Security (RLS) policies.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Routes & Pages

| Route | Description |
| :--- | :--- |
| `/` | Homepage with 3D neon tunnel, curated events, live ticket modal, and M-Pesa checkout |
| `/events` | Filterable event catalog with category pills, date search, and price sorting |
| `/events/[id]` | Event detail pages with Schema.org JSON-LD structured data and OpenGraph tags |
| `/dashboard` | Organizer dashboard with KES revenue charts, tier velocity, and attendee manifests |
| `/scanner` | Gate control PWA scanner with offline verification, camera QR reader, and audio feedback |
| `/tickets/[code]` | Digital ticket pass with SVG QR matrix, HMAC authenticity badge, and WhatsApp sharing |
| `/about` | Platform mission, organizer partnership information, and contact details |
| `/api/checkout` | Initiates M-Pesa STK push and handles atomic ticket reservation |
| `/api/mpesa/callback` | Safaricom Daraja webhook receiver for payment confirmation |
| `/api/tickets/verify` | Gate scanner verification endpoint with HMAC signature validation |
| `/api/orders/expire` | Cron endpoint for releasing stale orders and uncompleted reservations |

---

## 🔒 Security & Privacy

- **Zero Secrets Committed**: All API keys, consumer secrets, passkeys, and service role tokens are kept in `.env.local` and excluded via `.gitignore`.
- **HMAC-SHA256 Signatures**: Ticket passes cannot be forged or counterfeited without the server-side signing secret.
- **Row-Level Security (RLS)**: Client access to orders and payment tables is strictly gated.
- **Idempotent Webhooks**: Double-processing of M-Pesa callbacks is rejected using unique receipt number checks.

---

## 📄 License

Proprietary © Pulse Events KE. All rights reserved.
