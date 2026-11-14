import { NextRequest, NextResponse } from "next/server";
// import { initiateSTKPush } from "@/lib/mpesa";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount } = body;

    if (!phone || !amount) {
      return NextResponse.json(
        { error: "Phone and amount are required" },
        { status: 400 }
      );
    }

    // TODO: Uncomment when M-Pesa credentials are configured
    // const result = await initiateSTKPush({
    //   phone,
    //   amount,
    //   accountRef: `PULSE-${Date.now()}`,
    //   callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/callback`,
    // });

    return NextResponse.json({
      success: true,
      message: "STK push initiated (sandbox mode)",
      // result,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
