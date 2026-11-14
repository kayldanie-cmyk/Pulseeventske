import { NextRequest, NextResponse } from "next/server";
import { orderStore } from "@/lib/mpesa";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let expiredCount = 0;

    // 1. Database sweep
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.rpc("expire_stale_orders");
      if (error) {
        console.error("Supabase expire_stale_orders error:", error);
      } else if (typeof data === "number") {
        expiredCount += data;
      }
    }

    // 2. In-memory sweep (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [key, order] of orderStore.entries()) {
      if (order.status === "pending" && order.createdAt < fiveMinutesAgo) {
        orderStore.set(key, { ...order, status: "expired" });
        expiredCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Expired ${expiredCount} stale orders.`,
      expiredCount,
    });
  } catch (error) {
    console.error("Stale order expiration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow GET for simple monitoring or external pingers if authorized
export async function GET(req: NextRequest) {
  return POST(req);
}
