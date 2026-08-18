import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import {
  sendTeamsMessage,
  sendTeamsMessageFromEmail,
  getItemData,
  getMondayUserEmail,
} from "@/lib/teams";

import { sendTeamsGroupChatMessages } from "@/lib/group-chat";

import { renderTemplate } from "@/lib/render-template";
import { saveExecution } from "@/lib/diagnostics";

type TeamsConfig = {
  senderMode?: string;
  senderColumn?: string;
  recipientColumn?: string;
  ccColumns?: string[];
  groupChats?: string[];
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

function detectEvent(text: string) {
  const value = text.toLowerCase();

  if (value.includes("commentaire") || value.includes("update")) {
    return "Update created";
  }

  if (value.includes("statut")) {
    return "Status changed";
  }

  if (value.includes("créée") || value.includes("créé")) {
    return "Item created";
  }

  return "Monday automation";
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

function getTeamsChatsFromColumn(
  itemData: any
): string[] {
  const column = itemData?.column_values?.find(
    (value: any) =>
      value?.column?.title?.trim().toLowerCase() ===
      "teams chats"
  );

  const text = column?.text?.trim();

  if (!text) {
    return [];
  }

  return text
    .split(";")
    .map((chat: string) => chat.trim())
    .filter(Boolean);
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
    { processedAt: new Date().toISOString() },
    { ex: ACTION_TTL_SECONDS }
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
  recipientColumns: string[] = []
) {
  return Array.from(
    new Set(
      recipientColumns.flatMap((columnId) =>
        getPeopleIdsFromColumn(itemData, columnId)
      )
    )
  );
}

async function sendTeamsNotification(params: {
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

      return {
        senderEmail: actorEmail,
        fallbackUsed: false,
      };
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

  return {
    senderEmail: "configured-column",
    fallbackUsed: true,
  };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const body = await req.json();

  if (body.challenge) {
    return NextResponse.json({
      challenge: body.challenge,
    });
  }

  const actionUuid =
    body.runtimeMetadata?.actionUuid;

  const isDuplicate =
    await ignoreDuplicateAction(actionUuid);

  if (isDuplicate) {
    return NextResponse.json({
      success: true,
      duplicate: true,
    });
  }

  const inputFields = body.payload?.inputFields || {};

  const groupsOnlyAction =
    req.nextUrl.searchParams.get("mode") === "groups";

const notifyTeamsChats =
  groupsOnlyAction ||
  inputFields.notifyTeamsChats === true ||
  inputFields.notifyTeamsChats === "true" ||
  inputFields.notifyTeamsChats === "Yes";

  const boardId =
    String(
      inputFields.boardId ||
      body.runtimeMetadata?.hostMetadata?.hostInstanceId ||
      ""
    );

const rawMessage = inputFields.message || "";

const actorEmail = extractActorEmail(rawMessage);

  const itemId =
    body.payload?.pulseId ||
    body.payload?.itemId ||
    body.event?.pulseId ||
    body.event?.itemId ||
    extractItemId(rawMessage);

    const missingItemLink = !itemId;

  const itemData = itemId
    ? await getItemData(String(itemId))
    : null;

  const config = boardId
    ? await kv.get<TeamsConfig>(`teams-config:${boardId}`)
    : null;

const recipientColumns = [
  inputFields.recipient1,
  inputFields.recipient2,
  inputFields.recipient3,
  inputFields.recipient4,
]
  .flat()
  .filter(Boolean);

const groupChats =
  notifyTeamsChats && itemData
    ? getTeamsChatsFromColumn(itemData)
    : [];

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
      recipientColumns
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

let message = renderTemplate(
  cleanMessage(template),
  buildContext(itemData, inputFields)
);

const hasRecipients =
  recipientIds.length > 0 ||
  groupChats.length > 0;

if (!requesterId || !hasRecipients || !message) {

const error =
  missingItemLink
    ? 'Configuration invalide : la variable "Item\'s Link" est absente du message. Ajoutez la variable "Item\'s Link" dans le champ Message de votre automatisation monday.com, puis relancez le test.'
    : !requesterId
      ? "No sender found"
      : !hasRecipients
        ? "No recipient found"
        : "Message is empty";

    console.error(error, {
      boardId,
      itemId,
      recipientColumns,
      config,
    });

    await saveExecution({
      id: actionUuid || crypto.randomUUID(),
      date: new Date().toISOString(),
      boardId,
      event: detectEvent(rawMessage),
      sender: {
        mode: config?.senderMode || "configuredColumn",
        email: actorEmail || "",
        fallbackUsed: false,
      },
      recipients: [
  ...recipientIds,
  ...groupChats.map((chat) => `GROUP:${chat}`),
],
      success: false,
      error,
      durationMs: Date.now() - startedAt,
      message,
boardName: itemData?.board?.name || "",
itemName: itemData?.name || "",
itemUrl: itemData?.url || "",
    });

    return NextResponse.json(
      {
        success: false,
        error,
      },
      { status: 400 }
    );
  }

  let senderEmail: string | null = null;
  let groupChatResults: any[] = [];
  try {
let senderResult: {
  senderEmail: string;
  fallbackUsed: boolean;
};

if (recipientIds.length > 0) {
  senderResult =
    await sendTeamsNotification({
      config,
      actorEmail,
      requesterId: String(requesterId),
      recipientIds,
      message,
    });
} else {
  senderResult = {
    senderEmail: actorEmail || "configured-column",
    fallbackUsed: !actorEmail,
  };
}

// Envoi vers les chats Teams configurés
if (groupChats.length > 0) {
  /*
   * On utilise exactement le même expéditeur
   * que celui qui a réellement servi pour les
   * notifications privées.
   */
  if (senderResult.fallbackUsed) {
    senderEmail = await getMondayUserEmail(
      String(requesterId)
    );
  } else {
    senderEmail = actorEmail;
  }

if (senderEmail) {

  groupChatResults =
    await sendTeamsGroupChatMessages(
      senderEmail,
      groupChats,
      message
    );

} else {

  throw new Error(
    "No senderEmail available for Teams group notification."
  );

}

}

    await saveExecution({
      id: actionUuid || crypto.randomUUID(),
      date: new Date().toISOString(),
      boardId,
      event: detectEvent(rawMessage),
      sender: {
        mode: config?.senderMode || "configuredColumn",
        email: senderResult.senderEmail,
        fallbackUsed: senderResult.fallbackUsed,
      },
      recipients: [
  ...recipientIds,
  ...groupChats.map((chat) => `GROUP:${chat}`),
],
      success: true,
      durationMs: Date.now() - startedAt,
      message,
      debug: {
  senderEmail,
  senderResult: senderResult.senderEmail,
  fallbackUsed: senderResult.fallbackUsed,
  teamsChats: groupChats,
  groupChatResults,
},
boardName: itemData?.board?.name || "",
itemName: itemData?.name || "",
itemUrl: itemData?.url || "",
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("SEND FAILED", error);

    await saveExecution({
      id: actionUuid || crypto.randomUUID(),
      date: new Date().toISOString(),
      boardId,
      event: detectEvent(rawMessage),
      sender: {
        mode: config?.senderMode || "configuredColumn",
        email: actorEmail || "",
        fallbackUsed: false,
      },
      recipients: [
  ...recipientIds,
  ...groupChats.map((chat) => `GROUP:${chat}`),
],
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
      durationMs: Date.now() - startedAt,
      message,
      debug: {
  teamsChats: groupChats,
  senderEmail,
},
boardName: itemData?.board?.name || "",
itemName: itemData?.name || "",
itemUrl: itemData?.url || "",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}