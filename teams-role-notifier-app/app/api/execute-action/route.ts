import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import { sendTeamsMessage, getItemData } from "@/lib/teams";
import { renderTemplate } from "@/lib/render-template";

type TeamsConfig = {
  senderColumn?: string;
  recipientColumn?: string;
  ccColumns?: string[];
  template?: string;
};

function extractItemIdFromText(text: string) {
  const match = text.match(/\/pulses\/(\d+)/);
  return match?.[1] || null;
}

function getPeopleIdsFromColumn(itemData: any, columnId?: string) {
  if (!columnId) return [];

  const column = itemData?.column_values?.find(
    (value: any) => value.id === columnId
  );

  if (!column?.value) return [];

  try {
    const parsed = JSON.parse(column.value);

    const people =
      parsed.personsAndTeams ||
      parsed.persons_and_teams ||
      [];

    return people
      .filter((person: any) => person.kind === "person")
      .map((person: any) => String(person.id));
  } catch {
    return [];
  }
}

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

  const boardId =
    body.runtimeMetadata?.hostMetadata?.hostInstanceId;

  const rawMessage = inputFields.message || "";

  const itemId =
    body.payload?.pulseId ||
    body.payload?.itemId ||
    body.event?.pulseId ||
    body.event?.itemId ||
    extractItemIdFromText(rawMessage);

  let itemData = null;

  if (itemId) {
    itemData = await getItemData(String(itemId));
  }

  const config = boardId
    ? await kv.get<TeamsConfig>(`teams-config:${boardId}`)
    : null;

  let requesterId = inputFields.requester?.id;

  let recipientIds = [
    inputFields.integrator?.id,
    inputFields.additionalRecipients?.id,
  ]
    .filter(Boolean)
    .map(String);

  if (config && itemData) {
    const senderIds = getPeopleIdsFromColumn(
      itemData,
      config.senderColumn
    );

    const mainRecipientIds = getPeopleIdsFromColumn(
      itemData,
      config.recipientColumn
    );

    const ccRecipientIds = (config.ccColumns || []).flatMap(
      (columnId) => getPeopleIdsFromColumn(itemData, columnId)
    );

    requesterId = senderIds[0];

    recipientIds = [
      ...mainRecipientIds,
      ...ccRecipientIds,
    ];
  }

  recipientIds = Array.from(new Set(recipientIds));

  const template =
    config?.template || rawMessage;

  const context = {
    "requester.name": inputFields.requester?.name || "",
    "integrator.name": inputFields.integrator?.name || "",
    "item.id": itemData?.id || "",
    "item.name": itemData?.name || "",
    "item.url": itemData?.url || "",
    "board.id": itemData?.board?.id || "",
    "board.name": itemData?.board?.name || "",
    "board.url": itemData?.board?.id
      ? `https://oonetic-company.monday.com/boards/${itemData.board.id}`
      : "",
  };

  const message = renderTemplate(template, context);

  if (!requesterId || recipientIds.length === 0 || !message) {
    console.error("Missing required data", {
      requesterId,
      recipientIds,
      message,
      boardId,
      itemId,
      config,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Missing sender, recipients or message",
      },
      { status: 400 }
    );
  }

  await sendTeamsMessage(
    String(requesterId),
    recipientIds,
    message
  );

  return NextResponse.json({
    success: true,
  });
}