import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Basic verification echo (for WhatsApp webhook verification if needed)
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  if (mode === "subscribe" && challenge && token) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: NextRequest) {
  // Minimal placeholder to acknowledge receipt for future WhatsApp integration
  try {
    const payload = await req.json();
    // Optionally parse incoming message body safely
    const text =
      payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "";
    return NextResponse.json({ status: "received", text }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "received" }, { status: 200 });
  }
}
