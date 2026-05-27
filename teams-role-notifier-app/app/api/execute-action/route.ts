import { NextRequest, NextResponse } from "next/server";

import { sendTeamsMessage } from "@/lib/teams";

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

  const message =
    body.payload?.inputFields?.message;

  const person =
  body.payload?.inputFields?.person;

await sendTeamsMessage(
  person,
  message
);

  return NextResponse.json({
    success: true
  });
}