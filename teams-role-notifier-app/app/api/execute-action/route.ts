import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createHmac, timingSafeEqual } from "crypto";

import {
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

type MondayAuthorizationPayload = {
  accountId?: number | string;
  userId?: number | string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  shortLivedToken?: string;
};

const ACTION_TTL_SECONDS = 60 * 60 * 24;

function extractItemId(text: string) {
  return text.match(/\/pulses\/(\d+)/)?.[1] || null;
}

/*
 * Anciennes recettes :
 * si ACTOR=... est encore présent dans un message,
 * on le retire simplement du message final.
 *
 * Il n'est PLUS utilisé pour déterminer l'expéditeur.
 */
function cleanMessage(text: string) {
  return text.replace(/ACTOR=[^\n\r]+[\n\r]*/g, "").trim();
}

function detectEvent(text: string) {
  const value = text.toLowerCase();

  if (
    value.includes("commentaire") ||
    value.includes("update")
  ) {
    return "Update created";
  }

  if (value.includes("statut")) {
    return "Status changed";
  }

  if (
    value.includes("créée") ||
    value.includes("créé")
  ) {
    return "Item created";
  }

  return "Monday automation";
}

/*
 * Vérifie le JWT envoyé par monday.
 *
 * Le JWT est signé avec MONDAY_SIGNING_SECRET.
 * Le userId contenu dans le JWT correspond
 * à l'utilisateur monday qui a déclenché l'action.
 */
function verifyMondayAuthorization(
  req: NextRequest
): MondayAuthorizationPayload {
  const signingSecret =
    process.env.MONDAY_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error(
      "MONDAY_SIGNING_SECRET is not configured"
    );
  }

  const authorization =
    req.headers.get("authorization");

  if (!authorization) {
    throw new Error(
      "Missing monday Authorization header"
    );
  }

  const token = authorization
    .replace(/^Bearer\s+/i, "")
    .trim();

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid monday Authorization token"
    );
  }

  const [
    encodedHeader,
    encodedPayload,
    encodedSignature,
  ] = parts;

  let header: any;
  let payload: MondayAuthorizationPayload;

  try {
    header = JSON.parse(
      Buffer.from(
        encodedHeader,
        "base64url"
      ).toString("utf8")
    );

    payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    throw new Error(
      "Unable to decode monday Authorization token"
    );
  }

  if (header?.alg !== "HS256") {
    throw new Error(
      "Unsupported monday JWT algorithm"
    );
  }

  const signedContent =
    `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = createHmac(
    "sha256",
    signingSecret
  )
    .update(signedContent)
    .digest();

  let receivedSignature: Buffer;

  try {
    receivedSignature = Buffer.from(
      encodedSignature,
      "base64url"
    );
  } catch {
    throw new Error(
      "Invalid monday JWT signature"
    );
  }

  if (
    expectedSignature.length !==
      receivedSignature.length ||
    !timingSafeEqual(
      expectedSignature,
      receivedSignature
    )
  ) {
    throw new Error(
      "Invalid monday JWT signature"
    );
  }

  /*
   * Vérification de l'expiration.
   */
  const now =
    Math.floor(Date.now() / 1000);

  if (
    typeof payload.exp === "number" &&
    payload.exp <= now
  ) {
    throw new Error(
      "monday Authorization token has expired"
    );
  }

  /*
   * Vérification de l'audience.
   */
  if (payload.aud) {
    const expectedAudience =
      req.nextUrl.toString().replace(/\/$/, "");

    const audiences =
      Array.isArray(payload.aud)
        ? payload.aud
        : [payload.aud];

    const audienceIsValid =
      audiences.some(
        (audience) =>
          String(audience)
            .replace(/\/$/, "") ===
          expectedAudience
      );

    if (!audienceIsValid) {
      console.error(
        "MONDAY JWT AUDIENCE MISMATCH",
        {
          expectedAudience,
          receivedAudience: payload.aud,
        }
      );

      throw new Error(
        "Invalid monday JWT audience"
      );
    }
  }

  if (!payload.userId) {
    throw new Error(
      "No monday action author found in Authorization token"
    );
  }

  return payload;
}

function getPeopleIdsFromColumn(
  itemData: any,
  columnId?: string
) {
  if (!columnId) return [];

  const column =
    itemData?.column_values?.find(
      (value: any) =>
        value.id === columnId
    );

  if (!column?.value) return [];

  try {
    const parsed =
      JSON.parse(column.value);

    const people =
      parsed.personsAndTeams ||
      parsed.persons_and_teams ||
      [];

    return people
      .filter(
        (person: any) =>
          person.kind === "person"
      )
      .map(
        (person: any) =>
          String(person.id)
      );
  } catch {
    return [];
  }
}

function getTeamsChatsFromColumn(
  itemData: any
): string[] {
  const column =
    itemData?.column_values?.find(
      (value: any) =>
        value?.column?.title
          ?.trim()
          .toLowerCase() ===
        "teams chats"
    );

  const text =
    column?.text?.trim();

  if (!text) {
    return [];
  }

  return text
    .split(";")
    .map(
      (chat: string) =>
        chat.trim()
    )
    .filter(Boolean);
}

async function ignoreDuplicateAction(
  actionUuid?: string
) {
  if (!actionUuid) return false;

  const key =
    `monday-action:${actionUuid}`;

  const alreadyProcessed =
    await kv.get(key);

  if (alreadyProcessed) {
    console.log(
      "DUPLICATE ACTION IGNORED",
      actionUuid
    );

    return true;
  }

  await kv.set(
    key,
    {
      processedAt:
        new Date().toISOString(),
    },
    {
      ex: ACTION_TTL_SECONDS,
    }
  );

  return false;
}

function buildContext(
  itemData: any,
  inputFields: any
) {
  return {
    "requester.name":
      inputFields.requester?.name || "",

    "integrator.name":
      inputFields.integrator?.name || "",

    "item.id":
      itemData?.id || "",

    "item.name":
      itemData?.name || "",

    "item.url":
      itemData?.url || "",

    "creator.name":
      itemData?.creator?.name || "",

    "creator.email":
      itemData?.creator?.email || "",

    "board.id":
      itemData?.board?.id || "",

    "board.name":
      itemData?.board?.name || "",

    "board.url":
      itemData?.board?.id
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
      recipientColumns.flatMap(
        (columnId) =>
          getPeopleIdsFromColumn(
            itemData,
            columnId
          )
      )
    )
  );
}

export async function POST(
  req: NextRequest
) {
  const startedAt = Date.now();

  const body = await req.json();

  /*
   * Challenge monday éventuel.
   */
  if (body.challenge) {
    return NextResponse.json({
      challenge: body.challenge,
    });
  }

  const actionUuid =
    body.runtimeMetadata?.actionUuid;

  const inputFields =
    body.payload?.inputFields || {};

  const boardId =
    String(
      inputFields.boardId ||
      body.runtimeMetadata
        ?.hostMetadata
        ?.hostInstanceId ||
      ""
    );

  const rawMessage =
    inputFields.message || "";

  /*
   * --------------------------------------------------
   * IDENTIFICATION DE L'AUTEUR DE L'ACTION
   * --------------------------------------------------
   *
   * Il s'agit désormais de l'UNIQUE méthode
   * utilisée pour déterminer l'expéditeur Teams.
   *
   * Aucune colonne Expéditeur.
   * Aucun fallback vers le créateur.
   * Aucune configuration Teams Center.
   */
  let actionUserId: string | null = null;

  try {
    const mondayAuth =
      verifyMondayAuthorization(req);

    actionUserId =
      String(mondayAuth.userId);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to verify monday action author";

    console.error(
      "MONDAY AUTHORIZATION FAILED",
      error
    );

    await saveExecution({
      id:
        actionUuid ||
        crypto.randomUUID(),

      date:
        new Date().toISOString(),

      boardId,

      event:
        detectEvent(rawMessage),

      sender: {
        mode: "triggeredBy",
        email: "",
        fallbackUsed: false,
      },

      recipients: [],

      success: false,

      error:
        `Impossible de déterminer l'auteur de l'action monday : ${errorMessage}`,

      durationMs:
        Date.now() - startedAt,

      message: rawMessage,

      boardName: "",
      itemName: "",
      itemUrl: "",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          `Impossible de déterminer l'auteur de l'action monday : ${errorMessage}`,
      },
      {
        status: 401,
      }
    );
  }

  /*
   * Anti-doublon.
   */
  const isDuplicate =
    await ignoreDuplicateAction(
      actionUuid
    );

  if (isDuplicate) {
    return NextResponse.json({
      success: true,
      duplicate: true,
    });
  }

  const groupsOnlyAction =
    req.nextUrl.searchParams.get(
      "mode"
    ) === "groups";

  const notifyTeamsChats =
    groupsOnlyAction ||
    inputFields.notifyTeamsChats === true ||
    inputFields.notifyTeamsChats ===
      "true" ||
    inputFields.notifyTeamsChats ===
      "Yes";

  const itemId =
    body.payload?.pulseId ||
    body.payload?.itemId ||
    body.event?.pulseId ||
    body.event?.itemId ||
    extractItemId(rawMessage);

  const missingItemLink =
    !itemId;

  const itemData =
    itemId
      ? await getItemData(
          String(itemId)
        )
      : null;

  /*
   * La configuration du board reste chargée
   * uniquement pour les éléments qui servent
   * encore, comme le template.
   *
   * senderMode et senderColumn sont ignorés.
   */
  const config =
    boardId
      ? await kv.get<TeamsConfig>(
          `teams-config:${boardId}`
        )
      : null;

  /*
   * Conversion du userId monday de l'auteur
   * en adresse email.
   */
  let actorEmail:
    | string
    | null = null;

  let actorResolutionError =
    "";

  try {
    actorEmail =
      await getMondayUserEmail(
        String(actionUserId)
      );
  } catch (error) {
    actorResolutionError =
      error instanceof Error
        ? error.message
        : "Unknown monday user error";

    console.error(
      "ACTION AUTHOR EMAIL LOOKUP FAILED",
      {
        actionUserId,
        error,
      }
    );
  }

  const recipientColumns = [
    inputFields.recipient1,
    inputFields.recipient2,
    inputFields.recipient3,
    inputFields.recipient4,
  ]
    .flat()
    .filter(Boolean);

  const groupChats =
    notifyTeamsChats &&
    itemData
      ? getTeamsChatsFromColumn(
          itemData
        )
      : [];

  const recipientIds =
    itemData
      ? getRecipientIds(
          itemData,
          recipientColumns
        )
      : [
          inputFields.integrator?.id,
          inputFields
            .additionalRecipients?.id,
        ]
          .filter(Boolean)
          .map(String);

  const template =
    rawMessage ||
    config?.template ||
    "";

  const message =
    renderTemplate(
      cleanMessage(template),
      buildContext(
        itemData,
        inputFields
      )
    );

  const hasRecipients =
    recipientIds.length > 0 ||
    groupChats.length > 0;

  /*
   * Validation avant envoi.
   */
  if (
    missingItemLink ||
    !actorEmail ||
    !hasRecipients ||
    !message
  ) {
    const error =
      missingItemLink
        ? 'Configuration invalide : la variable "Item\'s Link" est absente du message. Ajoutez la variable "Item\'s Link" dans le champ Message de votre automatisation monday.com, puis relancez le test.'
        : !actorEmail
          ? `Impossible de déterminer l'adresse Microsoft de l'auteur de l'action monday${actorResolutionError ? ` : ${actorResolutionError}` : "."}`
          : !hasRecipients
            ? "No recipient found"
            : "Message is empty";

    console.error(
      error,
      {
        boardId,
        itemId,
        actionUserId,
        actorEmail,
        recipientColumns,
      }
    );

    await saveExecution({
      id:
        actionUuid ||
        crypto.randomUUID(),

      date:
        new Date().toISOString(),

      boardId,

      event:
        detectEvent(rawMessage),

      sender: {
        mode: "triggeredBy",
        email:
          actorEmail || "",
        fallbackUsed: false,
      },

      recipients: [
        ...recipientIds,
        ...groupChats.map(
          (chat) =>
            `GROUP:${chat}`
        ),
      ],

      success: false,

      error,

      durationMs:
        Date.now() - startedAt,

      message,

      debug: {
        actionUserId,
        actorEmail,
        teamsChats:
          groupChats,
      },

      boardName:
        itemData?.board?.name ||
        "",

      itemName:
        itemData?.name || "",

      itemUrl:
        itemData?.url || "",
    });

    return NextResponse.json(
      {
        success: false,
        error,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * --------------------------------------------------
   * ENVOI
   * --------------------------------------------------
   *
   * actorEmail est maintenant TOUJOURS
   * l'expéditeur Microsoft.
   */
  try {
    let privateMessageResult:
      any = null;

    let groupChatResults:
      any[] = [];

    /*
     * Messages privés.
     */
    if (
      recipientIds.length > 0
    ) {
      privateMessageResult =
        await sendTeamsMessageFromEmail(
          actorEmail,
          recipientIds,
          message
        );
    }

    /*
     * Messages vers groupes Teams.
     */
    if (
      groupChats.length > 0
    ) {
      groupChatResults =
        await sendTeamsGroupChatMessages(
          actorEmail,
          groupChats,
          message
        );

      /*
       * Si tous les groupes échouent,
       * l'exécution ne doit pas apparaître
       * comme un faux succès.
       */
      const successfulGroups =
        groupChatResults.filter(
          (result) =>
            result.success
        );

      if (
        successfulGroups.length === 0
      ) {
        throw new Error(
          `All Teams group notifications failed: ${JSON.stringify(
            groupChatResults
          )}`
        );
      }
    }

    await saveExecution({
      id:
        actionUuid ||
        crypto.randomUUID(),

      date:
        new Date().toISOString(),

      boardId,

      event:
        detectEvent(rawMessage),

      sender: {
        mode: "triggeredBy",
        email: actorEmail,
        fallbackUsed: false,
      },

      recipients: [
        ...recipientIds,
        ...groupChats.map(
          (chat) =>
            `GROUP:${chat}`
        ),
      ],

      success: true,

      durationMs:
        Date.now() - startedAt,

      message,

      debug: {
        actionUserId,
        senderEmail:
          actorEmail,
        senderResult:
          "monday-action-author",
        fallbackUsed: false,
        privateMessageResult,
        teamsChats:
          groupChats,
        groupChatResults,
      },

      boardName:
        itemData?.board?.name ||
        "",

      itemName:
        itemData?.name || "",

      itemUrl:
        itemData?.url || "",
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "SEND FAILED",
      error
    );

    await saveExecution({
      id:
        actionUuid ||
        crypto.randomUUID(),

      date:
        new Date().toISOString(),

      boardId,

      event:
        detectEvent(rawMessage),

      sender: {
        mode: "triggeredBy",
        email: actorEmail,
        fallbackUsed: false,
      },

      recipients: [
        ...recipientIds,
        ...groupChats.map(
          (chat) =>
            `GROUP:${chat}`
        ),
      ],

      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Unknown error",

      durationMs:
        Date.now() - startedAt,

      message,

      debug: {
        actionUserId,
        senderEmail:
          actorEmail,
        fallbackUsed: false,
        teamsChats:
          groupChats,
      },

      boardName:
        itemData?.board?.name ||
        "",

      itemName:
        itemData?.name || "",

      itemUrl:
        itemData?.url || "",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}