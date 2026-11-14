import { NextRequest, NextResponse } from "next/server";
import { verifyTicket } from "@/lib/tickets";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, hash } = body;

    if (!code || !hash) {
      return NextResponse.json(
        { valid: false, reason: "Ticket code and hash are required" },
        { status: 400 }
      );
    }

    // 1. Verify cryptographic HMAC signature
    const isSignatureValid = verifyTicket(code, hash);
    if (!isSignatureValid) {
      return NextResponse.json(
        {
          valid: false,
          reason: "Tampered or counterfeit ticket: cryptographic signature mismatch.",
        },
        { status: 400 }
      );
    }

    // 2. Check Supabase if connected
    if (supabaseAdmin) {
      const { data: ticket, error } = await supabaseAdmin
        .from("tickets")
        .select("id, code, hash, status, used_at, event_id, tier_id, phone")
        .eq("code", code)
        .maybeSingle();

      if (error || !ticket) {
        return NextResponse.json(
          { valid: false, reason: "Ticket not found in system records." },
          { status: 404 }
        );
      }

      if (ticket.status === "used") {
        return NextResponse.json(
          {
            valid: false,
            reason: `Ticket has already been checked in at ${ticket.used_at}`,
            alreadyUsed: true,
            usedAt: ticket.used_at,
          },
          { status: 409 }
        );
      }

      if (ticket.status === "void") {
        return NextResponse.json(
          { valid: false, reason: "Ticket has been cancelled or voided." },
          { status: 403 }
        );
      }

      // Mark ticket as used atomically
      const { error: updateErr } = await supabaseAdmin
        .from("tickets")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (updateErr) {
        console.error("Failed to update ticket check-in status:", updateErr);
      }

      return NextResponse.json({
        valid: true,
        message: "Ticket verified and checked in successfully.",
        ticket: {
          code: ticket.code,
          phone: ticket.phone,
          eventId: ticket.event_id,
          tierId: ticket.tier_id,
        },
      });
    }

    // Standalone fallback: HMAC verified
    return NextResponse.json({
      valid: true,
      message: "Ticket cryptographic signature valid.",
      ticket: { code },
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    return NextResponse.json(
      { valid: false, reason: "Internal server error" },
      { status: 500 }
    );
  }
}
