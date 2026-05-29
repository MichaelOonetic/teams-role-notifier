import { NextRequest, NextResponse } from "next/server";

import { sendTeamsMessage, getItemData } from "@/lib/teams";
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
  const additionalRecipientId = inputFields.additionalRecipients?.id;
  const rawMessage = inputFields.message;

  const itemId =
    body.payload?.pulseId ||
    body.payload?.itemId ||
    body.event?.pulseId ||
    body.event?.itemId;

  let itemData = null;

  if (itemId) {
    itemData = await getItemData(String(itemId));
  }

  const context = {
    "requester.name": inputFields.requester?.name || "",
    "integrator.name": inputFields.integrator?.name || "",
    "item.id": itemData?.id || "",
    "item.name": itemData?.name || "",
    "item.url": itemData?.url || "",
    "board.id": itemData?.board?.id || "",
    "board.name": itemData?.board?.name || "",
    "board.url": itemData?.board?.id
      ? `https://oonetic.monday.com/boards/${itemData.board.id}`
      : "",
  };

  const message = renderTemplate(rawMessage, context);

  if (!requesterId || !integratorId || !message) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing requester, integrator or message",
      },
      { status: 400 }
    );
  }

const recipientIds = [
  integratorId,
  additionalRecipientId
].filter(Boolean).map(String);

await sendTeamsMessage(
  String(requesterId),
  recipientIds,
  message
);

  return NextResponse.json({
    success: true,
  });
}