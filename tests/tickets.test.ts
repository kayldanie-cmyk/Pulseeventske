import { generateTicketId, hashTicket, verifyTicket } from "../src/lib/tickets";

describe("tickets", () => {
  test("generateTicketId returns a TKT- prefixed string", () => {
    const id = generateTicketId();
    expect(id).toMatch(/^TKT-[A-F0-9]{12}$/);
  });

  test("hashTicket produces consistent hashes", () => {
    const id = "TKT-ABCDEF123456";
    expect(hashTicket(id)).toBe(hashTicket(id));
  });

  test("verifyTicket returns true for valid pair", () => {
    const id = generateTicketId();
    const hash = hashTicket(id);
    expect(verifyTicket(id, hash)).toBe(true);
  });

  test("verifyTicket returns false for tampered hash", () => {
    const id = generateTicketId();
    expect(verifyTicket(id, "invalid-hash")).toBe(false);
  });
});
