import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import {
  sendTeamsMessage,
  sendTeamsMessageFromEmail,
  getItemData,
} from "@/lib/teams";

import { renderTemplate } from "@/lib/render-template";

type TeamsConfig = {
  senderMode?: string;
  senderColumn?: string;
  recipientColumn?: string;
  ccColumns?: string[];
  template?: string;
};

function extractItemIdFromText(text: string) {
  const match = text.match(/\/pulses\/(\d+)/);
  return match?.[1] || null;
}

function extractActorEmail(text: string) {
  const actorMatch = text.match(
    /ACTOR=([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );

  if (actorMatch?.[1]) {
    return actorMatch[1].toLowerCase();
  }

  const emailMatch = text.match(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );

  return emailMatch?.[1]?.toLowerCase() || null;
}

function removeActorLine(text: string) {
  return text.replace(/ACTOR=[^\n\r]+[\n\r]*/g, "").trim();
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

  const actionUuid = body.runtimeMetadata?.actionUuid;

  if (actionUuid) {
    const alreadyProcessed = await kv.get(
      `monday-action:${actionUuid}`
    );

    if (alreadyProcessed) {
      console.log("DUPLICATE ACTION IGNORED", actionUuid);

      return NextResponse.json({
        success: true,
        duplicate: true,
      });
    }

    await kv.set(
      `monday-action:${actionUuid}`,
      {
        processedAt: new Date().toISOString(),
      },
      {
        ex: 60 * 60 * 24,
      }
    );
  }

  const inputFields = body.payload?.inputFields || {};

  const boardId =
    inputFields.boardId ||
    body.runtimeMetadata?.hostMetadata?.hostInstanceId;

  const rawMessage = inputFields.message || "";
  const actorEmail = extractActorEmail(rawMessage);

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

  const senderColumn =
    config?.senderColumn;

  const recipientColumn =
    inputFields.recipientColumn ||
    config?.recipientColumn;

  const ccColumns =
    inputFields.ccColumn
      ? [inputFields.ccColumn]
      : config?.ccColumns || [];

  let requesterId =
    inputFields.requester?.id;

  let recipientIds = [
    inputFields.integrator?.id,
    inputFields.additionalRecipients?.id,
  ]
    .filter(Boolean)
    .map(String);

  if (itemData) {
    const senderIds =
      getPeopleIdsFromColumn(itemData, senderColumn);

    const mainRecipientIds =
      getPeopleIdsFromColumn(itemData, recipientColumn);

    const ccRecipientIds =
      ccColumns.flatMap((columnId) =>
        getPeopleIdsFromColumn(itemData, columnId)
      );

    requesterId =
      senderIds[0] ||
      itemData?.creator?.id;

    recipientIds = [
      ...mainRecipientIds,
      ...ccRecipientIds,
    ];
  }

  if (!requesterId && itemData?.creator?.id) {
    requesterId = itemData.creator.id;
  }

  recipientIds = Array.from(new Set(recipientIds));

  const template =
    rawMessage ||
    config?.template ||
    "";

  const context = {
    "requester.name": inputFields.requester?.name || "",
    "integrator.name": inputFields.integrator?.name || "",
    "item.id": itemData?.id || "",
    "item.name": itemData?.name || "",
    "item.url": itemData?.url || "",
    "creator.name": itemData?.creator?.name || "",
    "creator.email": itemData?.creator?.email || "",
    "board.id": itemData?.board?.id || "",
    "board.name": itemData?.board?.name || "",
    "board.url": itemData?.board?.id
      ? `https://oonetic-company.monday.com/boards/${itemData.board.id}`
      : "",
  };

  const message = renderTemplate(
    removeActorLine(template),
    context
  );

  if (!requesterId) {
    console.error("NO SENDER FOUND", {
      boardId,
      config,
      itemId,
    });

    return NextResponse.json(
      {
        success: false,
        error: "No sender found",
      },
      { status: 400 }
    );
  }

  if (recipientIds.length === 0) {
    console.error("NO RECIPIENT FOUND", {
      boardId,
      recipientColumn,
      ccColumns,
      config,
      itemId,
    });

    return NextResponse.json(
      {
        success: false,
        error: "No recipient found",
      },
      { status: 400 }
    );
  }

  if (!message) {
    console.error("EMPTY MESSAGE");

    return NextResponse.json(
      {
        success: false,
        error: "Message is empty",
      },
      { status: 400 }
    );
  }

  if (config?.senderMode === "triggeredBy" && actorEmail) {
    try {
      await sendTeamsMessageFromEmail(
        actorEmail,
        recipientIds,
        message
      );
    } catch (error) {
      console.error(
        "AUTHOR NOT CONNECTED - FALLBACK TO CONFIGURED SENDER",
        {
          actorEmail,
          error,
        }
      );

      await sendTeamsMessage(
        String(requesterId),
        recipientIds,
        message
      );
    }
  } else {
    await sendTeamsMessage(
      String(requesterId),
      recipientIds,
      message
    );
  }

  return NextResponse.json({
    success: true,
  });
}