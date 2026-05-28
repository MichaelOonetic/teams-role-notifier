import { NextRequest, NextResponse } from "next/server";

import { sendTeamsMessage } from "@/lib/teams";

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("MONDAY PAYLOAD:");
  console.log(JSON.stringify(body, null, 2));

  if (body.challenge) {
    return NextResponse.json({
      challenge: body.challenge,
    });
  }

  const inputFields = body.payload?.inputFields || {};

  const requesterId = inputFields.requester?.id;
  const integratorId = inputFields.integrator?.id;
  const message = inputFields.message;

  if (!requesterId || !integratorId || !message) {
    console.error("Missing required fields:", {
      requesterId,
      integratorId,
      message,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Missing requester, integrator or message",
      },
      { status: 400 }
    );
  }

  await sendTeamsMessage(
    String(requesterId),
    String(integratorId),
    message
  );

  return NextResponse.json({
    success: true,
  });
}