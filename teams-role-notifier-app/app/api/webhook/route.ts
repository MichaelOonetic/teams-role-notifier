import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook GET OK",
  });
}

export async function POST(req: any) {
  const body = await req.json();

  console.log(
    "MONDAY WEBHOOK PAYLOAD:",
    JSON.stringify(body, null, 2)
  );

  return NextResponse.json({
    success: true,
  });
}