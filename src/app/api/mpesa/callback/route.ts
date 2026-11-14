import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // TODO: Process M-Pesa callback
    // - Verify the callback signature
    // - Update ticket status in database
    // - Send confirmation SMS / email
    console.log("M-Pesa callback received:", JSON.stringify(body));

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Error" },
      { status: 500 }
    );
  }
}
