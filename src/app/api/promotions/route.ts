import { NextRequest, NextResponse } from "next/server";

const PROMO_PACKAGES = [
  { id: "starter", name: "Starter", price: 5000 },
  { id: "growth", name: "Growth", price: 15000 },
  { id: "premium", name: "Premium", price: 35000 },
];

export async function GET() {
  return NextResponse.json({ packages: PROMO_PACKAGES });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageId, eventId, email } = body;

    if (!packageId || !eventId || !email) {
      return NextResponse.json(
        { error: "packageId, eventId, and email are required" },
        { status: 400 }
      );
    }

    const pkg = PROMO_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    // TODO: Create promotion order and initiate payment
    return NextResponse.json({
      success: true,
      message: `Promotion "${pkg.name}" requested for event ${eventId}`,
      amount: pkg.price,
    });
  } catch (error) {
    console.error("Promotion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
