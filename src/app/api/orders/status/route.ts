import { NextRequest, NextResponse } from "next/server";
import { orderStore } from "@/lib/mpesa";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutRequestId = searchParams.get("checkoutRequestId");
    const orderId = searchParams.get("orderId");

    const lookupKey = checkoutRequestId || orderId;
    if (!lookupKey) {
      return NextResponse.json(
        { error: "checkoutRequestId or orderId query parameter is required" },
        { status: 400 }
      );
    }

    // 1. Check Supabase if connected
    if (supabaseAdmin) {
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

      const { data: dbOrder, error: dbErr } = checkoutRequestId
        ? await query.eq("checkout_request_id", checkoutRequestId).maybeSingle()
        : await query.eq("id", orderId).maybeSingle();

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

    // 2. Check in-memory order store
    const memOrder =
      orderStore.get(lookupKey) ||
      Array.from(orderStore.values()).find(
        (o) => o.orderId === lookupKey || o.checkoutRequestId === lookupKey
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

    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Order status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
