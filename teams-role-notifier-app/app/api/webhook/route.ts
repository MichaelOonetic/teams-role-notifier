import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook GET OK",
  });
}

export async function POST(req: any) {
  const body = await req.json();

  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  console.log("Webhook reçu :", body);

  return NextResponse.json({
    success: true,
    message: "Webhook reçu avec succès",
  });
}