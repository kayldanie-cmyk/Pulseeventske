import { NextRequest, NextResponse } from "next/server";
import {
  initiateSTKPush,
  normalizeKenyanPhone,
  orderStore,
} from "@/lib/mpesa";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateTicketId, hashTicket } from "@/lib/tickets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,
      amount,
      eventId,
      tierId,
      tierName,
      quantity = 1,
      accountRef = "PULSE",
    } = body;

    // Validate phone and amount
    if (!phone || !amount) {
      return NextResponse.json(
        { error: "Phone number and amount are required" },
        { status: 400 }
      );
    }

    const norm = normalizeKenyanPhone(String(phone));
    if (!norm.isValid) {
      return NextResponse.json(
        { error: norm.error || "Invalid Kenyan phone number" },
        { status: 400 }
      );
    }

    const orderQty = Math.max(1, Math.min(10, Number(quantity) || 1));
    const totalAmount = Math.round(Number(amount));
    let reservationMade = false;

    // 1. Supabase Atomic Reservation Check (If Supabase is connected & tierId is a valid UUID)
    const isUuid =
      typeof tierId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        tierId
      );

    if (supabaseAdmin && isUuid) {
      const { data: reserved, error: rpcErr } = await supabaseAdmin.rpc(
        "reserve_tickets",
        {
          p_tier_id: tierId,
          p_quantity: orderQty,
        }
      );

      if (rpcErr) {
        console.error("Supabase reserve_tickets error:", rpcErr);
      } else if (!reserved) {
        return NextResponse.json(
          {
            error:
              "Sorry, tickets in this tier are currently sold out or reserved by others.",
          },
          { status: 409 }
        );
      } else {
        reservationMade = true;
      }
    }

    // 2. Determine Callback URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";
    const callbackUrl = `${baseUrl.replace(/\/$/, "")}/api/mpesa/callback`;

    // 3. Initiate Daraja M-Pesa STK Push
    let stkRes;
    try {
      stkRes = await initiateSTKPush({
        phone: norm.phone,
        amount: totalAmount,
        accountRef: String(accountRef).slice(0, 12),
        callbackUrl,
        description: `Ticket ${tierName || "Pulse"}`,
      });
    } catch (stkErr) {
      console.error("M-Pesa STK Push initiation failed:", stkErr);

      // Rollback reservation if it was made
      if (reservationMade && supabaseAdmin && tierId) {
        try {
          await supabaseAdmin.rpc("release_reservation", {
            p_checkout_request_id: "FAILED_PRE_INIT",
          });
        } catch {
          // ignore rollback error
        }
      }

      return NextResponse.json(
        {
          error:
            stkErr instanceof Error
              ? stkErr.message
              : "Failed to initiate M-Pesa STK push. Please check your phone number and try again.",
        },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkRes.CheckoutRequestID;
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // 4. Record Pending Order in Supabase if connected
    if (supabaseAdmin && isUuid) {
      const { error: orderErr } = await supabaseAdmin.from("orders").insert({
        event_id: eventId,
        tier_id: tierId,
        quantity: orderQty,
        amount_kes: totalAmount,
        phone: norm.phone,
        status: "pending",
        checkout_request_id: checkoutRequestId,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      if (orderErr) {
        console.error("Failed to record order in Supabase:", orderErr);
      }
    }

    // 5. Always record in orderStore for live in-memory polling & demo mode
    orderStore.set(checkoutRequestId, {
      orderId,
      checkoutRequestId,
      phone: norm.phone,
      amount: totalAmount,
      eventId,
      tierId,
      status: "pending",
      createdAt: Date.now(),
    });

    // 6. If running in simulated sandbox mode (no live Daraja keys), auto-settle after 3 seconds for seamless demo testing
    const isLiveDaraja = Boolean(
      process.env.MPESA_CONSUMER_KEY &&
        process.env.MPESA_CONSUMER_SECRET &&
        process.env.MPESA_PASSKEY
    );

    if (!isLiveDaraja) {
      setTimeout(() => {
        const order = orderStore.get(checkoutRequestId);
        if (order && order.status === "pending") {
          const tickets = Array.from({ length: orderQty }).map(() => {
            const code = generateTicketId();
            return { code, hash: hashTicket(code) };
          });
          const receipt = `SG75${Math.floor(
            100000 + Math.random() * 900000
          )}KE`;
          orderStore.set(checkoutRequestId, {
            ...order,
            status: "paid",
            mpesaReceipt: receipt,
            tickets,
          });
        }
      }, 3000);
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId,
      orderId,
      phone: norm.phone,
      amount: totalAmount,
      customerMessage:
        stkRes.CustomerMessage ||
        `M-Pesa STK prompt sent to ${norm.phone}. Enter your PIN to complete the transaction.`,
    });
  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
