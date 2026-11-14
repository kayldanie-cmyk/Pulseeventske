import { NextRequest, NextResponse } from "next/server";
import { orderStore } from "@/lib/mpesa";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    // 1. Check Supabase if connected
    if (supabaseAdmin) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id
        );

      const query = supabaseAdmin.from("orders").select(`
        id,
        event_id,
        tier_id,
        quantity,
        amount_kes,
        phone,
        status,
        checkout_request_id,
        mpesa_receipt,
        expires_at,
        created_at
      `);

      const { data: dbOrder, error: dbErr } = isUuid
        ? await query.eq("id", id).maybeSingle()
        : await query.eq("checkout_request_id", id).maybeSingle();

      if (!dbErr && dbOrder) {
        let tickets: { code: string; hash: string }[] = [];
        if (dbOrder.status === "paid") {
          const { data: dbTickets } = await supabaseAdmin
            .from("tickets")
            .select("code, hash")
            .eq("order_id", dbOrder.id);
          if (dbTickets) {
            tickets = dbTickets;
          }
        }

        return NextResponse.json({
          success: true,
          status: dbOrder.status,
          orderId: dbOrder.id,
          checkoutRequestId: dbOrder.checkout_request_id,
          mpesaReceipt: dbOrder.mpesa_receipt,
          amount: dbOrder.amount_kes,
          phone: dbOrder.phone,
          tickets,
          expiresAt: dbOrder.expires_at,
        });
      }
    }

    // 2. Check in-memory store
    const memOrder =
      orderStore.get(id) ||
      Array.from(orderStore.values()).find(
        (o) => o.orderId === id || o.checkoutRequestId === id
      );

    if (memOrder) {
      return NextResponse.json({
        success: true,
        status: memOrder.status,
        orderId: memOrder.orderId,
        checkoutRequestId: memOrder.checkoutRequestId,
        mpesaReceipt: memOrder.mpesaReceipt,
        amount: memOrder.amount,
        phone: memOrder.phone,
        tickets: memOrder.tickets || [],
      });
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("Order status lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
