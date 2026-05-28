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

const requester =
  body.payload?.inputFields?.requester;

const integrator =
  body.payload?.inputFields?.integrator;

const message =
  body.payload?.inputFields?.message;

await sendTeamsMessage(
  String(requester.id),
  String(integrator.id),
  message
);

  return NextResponse.json({
    success: true
  });
}