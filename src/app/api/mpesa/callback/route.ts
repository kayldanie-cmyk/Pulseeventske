import { NextRequest, NextResponse } from "next/server";
import { orderStore } from "@/lib/mpesa";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateTicketId, hashTicket } from "@/lib/tickets";
import { sendTicketSMS } from "@/lib/notifications";

interface DarajaCallbackItem {
  Name: string;
  Value?: string | number;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log("M-Pesa Webhook Callback received:", JSON.stringify(rawBody));

    const stk = rawBody?.Body?.stkCallback || rawBody;
    const checkoutRequestId = stk?.CheckoutRequestID;
    const resultCode = Number(stk?.ResultCode);
    const resultDesc = stk?.ResultDesc || "No description provided";

    if (!checkoutRequestId) {
      console.warn("M-Pesa callback missing CheckoutRequestID");
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 1. Audit raw callback payload in Supabase payment_events table
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("payment_events").insert({
          checkout_request_id: checkoutRequestId,
          payload: rawBody,
        });
      } catch (auditErr) {
        console.error("Failed to audit payment event:", auditErr);
      }
    }

    // 2. Handle Payment Success (ResultCode === 0)
    if (resultCode === 0) {
      const items: DarajaCallbackItem[] =
        stk?.CallbackMetadata?.Item || [];
      const getVal = (name: string) =>
        items.find((i) => i.Name === name)?.Value;

      const amount = Number(getVal("Amount") || 0);
      const receiptNumber = String(getVal("MpesaReceiptNumber") || `MP-${Date.now()}`);
      const phone = String(getVal("PhoneNumber") || "");

      // Execute Supabase atomic confirmation
      if (supabaseAdmin) {
        try {
          const { data: confirmRes, error: confirmErr } =
            await supabaseAdmin.rpc("confirm_reservation", {
              p_checkout_request_id: checkoutRequestId,
              p_receipt_number: receiptNumber,
              p_paid_amount: amount,
            });

          if (confirmErr) {
            console.error("Supabase confirm_reservation error:", confirmErr);
          } else if (confirmRes?.success && !confirmRes.already_paid) {
            // Generate cryptographically verifiable tickets
            const qty = Number(confirmRes.quantity) || 1;
            const ticketInserts = [];
            for (let i = 0; i < qty; i++) {
              const code = generateTicketId();
              const hash = hashTicket(code);
              ticketInserts.push({
                order_id: confirmRes.order_id,
                event_id: confirmRes.event_id,
                tier_id: confirmRes.tier_id,
                code,
                hash,
                phone: confirmRes.phone || phone,
                status: "valid",
              });
            }

            const { error: ticketErr } = await supabaseAdmin
              .from("tickets")
              .insert(ticketInserts);

            if (ticketErr) {
              console.error("Failed to insert tickets in Supabase:", ticketErr);
            }
          }
        } catch (dbErr) {
          console.error("Error processing confirm_reservation in Supabase:", dbErr);
        }
      }

      // Update in-memory order store
      const order = orderStore.get(checkoutRequestId);
      if (order) {
        const generatedTickets = (order.tickets && order.tickets.length > 0)
          ? order.tickets
          : [
              {
                code: generateTicketId(),
                hash: hashTicket(generateTicketId()),
              },
            ];

        orderStore.set(checkoutRequestId, {
          ...order,
          status: "paid",
          mpesaReceipt: receiptNumber,
          tickets: generatedTickets,
        });

        sendTicketSMS({
          phone: order.phone,
          eventTitle: "Pulse Event",
          tierName: "Ticket Pass",
          ticketCode: generatedTickets[0]?.code || "TKT-PULSE",
          receiptNumber,
        }).catch((err) => console.error("Ticket SMS notification error:", err));
      }
    } else {
      // 3. Handle Payment Failure / Cancellation (ResultCode !== 0)
      console.log(`Payment failed for ${checkoutRequestId}: ${resultDesc} (Code: ${resultCode})`);

      if (supabaseAdmin) {
        try {
          await supabaseAdmin.rpc("release_reservation", {
            p_checkout_request_id: checkoutRequestId,
          });
        } catch (releaseErr) {
          console.error("Supabase release_reservation error:", releaseErr);
        }
      }

      const order = orderStore.get(checkoutRequestId);
      if (order) {
        orderStore.set(checkoutRequestId, {
          ...order,
          status: "failed",
        });
      }
    }

    // Safaricom Daraja expects standard acknowledgment:
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Error in M-Pesa callback handler:", error);
    // Still return 200 so Safaricom does not spam retries on unhandled server error
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
