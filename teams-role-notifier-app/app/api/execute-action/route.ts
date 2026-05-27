import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

  const body = await req.json();

  console.log("MONDAY PAYLOAD:");
  console.log(JSON.stringify(body, null, 2));

  // Handshake Monday
  if (body.challenge) {
    return NextResponse.json({
      challenge: body.challenge
    });
  }

  return NextResponse.json({
    success: true
  });
}