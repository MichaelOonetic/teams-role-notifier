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

const ACTION_TTL_SECONDS = 60 * 60 * 24;

function extractItemId(text: string) {
  return text.match(/\/pulses\/(\d+)/)?.[1] || null;
}

function extractActorEmail(text: string) {
  const explicitActor = text.match(
    /ACTOR=([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );

  if (explicitActor?.[1]) {
    return explicitActor[1].toLowerCase();
  }

  const firstEmail = text.match(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );

  return firstEmail?.[1]?.toLowerCase() || null;
}

function cleanMessage(text: string) {
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

async function ignoreDuplicateAction(actionUuid?: string) {
  if (!actionUuid) return false;

  const key = `monday-action:${actionUuid}`;

  const alreadyProcessed = await kv.get(key);

  if (alreadyProcessed) {
    console.log("DUPLICATE ACTION IGNORED", actionUuid);
    return true;
  }

  await kv.set(
    key,
    {
      processedAt: new Date().toISOString(),
    },
    {
      ex: ACTION_TTL_SECONDS,
    }
  );

  return false;
}

function buildContext(itemData: any, inputFields: any) {
  return {
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
}

function getRecipientIds(
  itemData: any,
  recipientColumn?: string,
  ccColumns: string[] = []
) {
  const mainRecipients =
    getPeopleIdsFromColumn(itemData, recipientColumn);

  const ccRecipients = ccColumns.flatMap((columnId) =>
    getPeopleIdsFromColumn(itemData, columnId)
  );

  return Array.from(
    new Set([
      ...mainRecipients,
      ...ccRecipients,
    ])
  );
}

async function sendMessage(params: {
  config: TeamsConfig | null;
  actorEmail: string | null;
  requesterId: string;
  recipientIds: string[];
  message: string;
}) {
  const {
    config,
    actorEmail,
    requesterId,
    recipientIds,
    message,
  } = params;

  if (config?.senderMode === "triggeredBy" && actorEmail) {
    try {
      await sendTeamsMessageFromEmail(
        actorEmail,
        recipientIds,
        message
      );

      return;
    } catch (error) {
      console.error(
        "AUTHOR NOT CONNECTED - FALLBACK TO CONFIGURED SENDER",
        {
          actorEmail,
          error,
        }
      );
    }
  }

  await sendTeamsMessage(
    requesterId,
    recipientIds,
    message
  );
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

  const isDuplicate =
    await ignoreDuplicateAction(
      body.runtimeMetadata?.actionUuid
    );

  if (isDuplicate) {
    return NextResponse.json({
      success: true,
      duplicate: true,
    });
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
    extractItemId(rawMessage);

  const itemData = itemId
    ? await getItemData(String(itemId))
    : null;

  const config = boardId
    ? await kv.get<TeamsConfig>(`teams-config:${boardId}`)
    : null;

  const recipientColumn =
    inputFields.recipientColumn ||
    config?.recipientColumn;

  const ccColumns =
    inputFields.ccColumn
      ? [inputFields.ccColumn]
      : config?.ccColumns || [];

  const senderIds =
    getPeopleIdsFromColumn(
      itemData,
      config?.senderColumn
    );

  const requesterId =
    senderIds[0] ||
    itemData?.creator?.id ||
    inputFields.requester?.id;

  const recipientIds = itemData
    ? getRecipientIds(
        itemData,
        recipientColumn,
        ccColumns
      )
    : [
        inputFields.integrator?.id,
        inputFields.additionalRecipients?.id,
      ]
        .filter(Boolean)
        .map(String);

  const template =
    rawMessage ||
    config?.template ||
    "";

  const message = renderTemplate(
    cleanMessage(template),
    buildContext(itemData, inputFields)
  );

  if (!requesterId) {
    console.error("NO SENDER FOUND", {
      boardId,
      itemId,
      config,
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
      itemId,
      recipientColumn,
      ccColumns,
      config,
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

  await sendMessage({
    config,
    actorEmail,
    requesterId: String(requesterId),
    recipientIds,
    message,
  });

  return NextResponse.json({
    success: true,
  });
}