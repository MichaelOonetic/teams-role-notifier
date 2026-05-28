import { NextRequest, NextResponse } from "next/server";

import { sendTeamsMessage } from "@/lib/teams";

import { renderTemplate } from "@/lib/render-template";

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
  const rawMessage = inputFields.message;

const itemId =
  body.runtimeMetadata?.hostMetadata?.hostInstanceId;

const context = {
  "requester.name": inputFields.requester?.name || "",
  "integrator.name": inputFields.integrator?.name || "",
  "item.id": itemId || "",
  "item.url": itemId
    ? `https://oonetic.monday.com/boards/${itemId}`
    : ""
};

const message = renderTemplate(
  rawMessage,
  context
);

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