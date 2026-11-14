import { randomBytes, createHmac } from "crypto";

const SECRET = process.env.TICKET_SECRET ?? "pulse-events-dev-secret";

export interface Ticket {
  id: string;
  eventId: string;
  tier: string;
  email: string;
  phone: string;
  issuedAt: string;
  hash: string;
}

export function generateTicketId(): string {
  return `TKT-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function hashTicket(ticketId: string): string {
  return createHmac("sha256", SECRET).update(ticketId).digest("hex");
}

export function verifyTicket(ticketId: string, hash: string): boolean {
  return hashTicket(ticketId) === hash;
}
