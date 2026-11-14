import { NextRequest, NextResponse } from "next/server";
import { verifyTicket } from "@/lib/tickets";

export async function POST(req: NextRequest) {
  try {
    const { ticketId, hash } = await req.json();

    if (!ticketId || !hash) {
      return NextResponse.json(
        { error: "ticketId and hash are required" },
        { status: 400 }
      );
    }

    const valid = verifyTicket(ticketId, hash);

    return NextResponse.json({
      valid,
      ticketId,
      message: valid ? "Ticket is valid ✓" : "Invalid ticket ✕",
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
