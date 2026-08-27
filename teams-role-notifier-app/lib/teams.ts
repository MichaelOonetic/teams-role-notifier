import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export type MondayUser = {
  id: string;
  name: string;
  email: string;
};

type RecipientResult = {
  mondayUserId: string;
  email?: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
};

type SendTeamsMessageResult = {
  sent: number;
  skipped: number;
  failed: number;
  results: RecipientResult[];
};

async function getAccessTokenFromRefreshToken(
  refreshToken: string,
  senderEmail: string
) {
  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: [
          "offline_access",
          "User.Read",
          "User.ReadBasic.All",
          "Chat.ReadWrite",
          "Chat.Create",
          "ChatMessage.Send",
        ].join(" "),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Refresh token failed: ${JSON.stringify(data)}`
    );
  }

  /*
   * Microsoft peut renvoyer un nouveau refresh token.
   * Lorsqu'il est présent, on remplace automatiquement
   * l'ancien token enregistré dans KV.
   */
  if (data.refresh_token) {
    await kv.set(
      `ms-refresh-token:${senderEmail.toLowerCase()}`,
      data.refresh_token
    );

    console.log(
      "MICROSOFT REFRESH TOKEN ROTATED",
      senderEmail.toLowerCase()
    );
  }

  return data.access_token;
}

export async function getMondayUsers(
  mondayUserIds: string[]
): Promise<MondayUser[]> {
  const ids = Array.from(new Set(mondayUserIds.filter(Boolean)));

  if (ids.length === 0) return [];

  const query = `
    query {
      users(ids: [${ids.join(",")}]) {
        id
        name
        email
      }
    }
  `;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  return (data.data?.users || []).map((user: any) => ({
    id: String(user.id),
    name: user.name || "",
    email: user.email || "",
  }));
}

export async function getMondayUser(
  mondayUserId: string
): Promise<MondayUser | null> {
  const users = await getMondayUsers([mondayUserId]);
  return users[0] || null;
}

export async function getMondayUserEmail(mondayUserId: string) {
  const user = await getMondayUser(mondayUserId);

  if (!user?.email) {
    throw new Error(`Monday user email not found: ${mondayUserId}`);
  }

  return user.email;
}

async function getTeamsUserId(token: string, email: string) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${email}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Get Teams user failed: ${JSON.stringify(data)}`);
  }

  return data.id;
}

async function createOrGetChat(token: string, targetUserId: string) {
  const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const me = await meResponse.json();
  const senderUserId = me.id;

  const response = await fetch("https://graph.microsoft.com/v1.0/chats", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatType: "oneOnOne",
      members: [
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${senderUserId}')`,
        },
        {
          "@odata.type": "#microsoft.graph.aadUserConversationMember",
          roles: ["owner"],
          "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${targetUserId}')`,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Create chat failed: ${JSON.stringify(data)}`);
  }

  return data.id;
}

async function sendMessageToChat(token: string, chatId: string, text: string) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: text.replace(/\n/g, "<br>"),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Send message failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function sendTeamsMessageFromEmail(
  senderEmail: string,
  recipientMondayUserIds: string[],
  text: string
): Promise<SendTeamsMessageResult> {
  const refreshToken = await kv.get<string>(
    `ms-refresh-token:${senderEmail.toLowerCase()}`
  );

  if (!refreshToken) {
    throw new Error(`No refresh token found for sender: ${senderEmail}`);
  }

  const delegatedToken = await getAccessTokenFromRefreshToken(
  refreshToken,
  senderEmail
);

  const uniqueRecipientIds = Array.from(
    new Set(recipientMondayUserIds.filter(Boolean).map(String))
  );

  const results: RecipientResult[] = [];

  for (const recipientMondayUserId of uniqueRecipientIds) {
    try {
      const targetEmail = await getMondayUserEmail(recipientMondayUserId);

      if (targetEmail.toLowerCase() === senderEmail.toLowerCase()) {
        results.push({
          mondayUserId: recipientMondayUserId,
          email: targetEmail,
          success: true,
          skipped: true,
        });
        continue;
      }

      const targetTeamsUserId = await getTeamsUserId(
        delegatedToken,
        targetEmail
      );

      const chatId = await createOrGetChat(
        delegatedToken,
        targetTeamsUserId
      );

      await sendMessageToChat(delegatedToken, chatId, text);

      results.push({
        mondayUserId: recipientMondayUserId,
        email: targetEmail,
        success: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";

      console.error("PRIVATE TEAMS NOTIFICATION FAILED", {
        senderEmail,
        recipientMondayUserId,
        error: message,
      });

      results.push({
        mondayUserId: recipientMondayUserId,
        success: false,
        error: message,
      });
    }
  }

  const sent = results.filter(
    (result) => result.success && !result.skipped
  ).length;

  const skipped = results.filter((result) => result.skipped).length;

  const failed = results.filter((result) => !result.success).length;

  if (sent === 0 && failed > 0) {
    throw new Error(
      `All private Teams notifications failed: ${JSON.stringify(results)}`
    );
  }

  return {
    sent,
    skipped,
    failed,
    results,
  };
}

export async function sendTeamsMessage(
  requesterMondayUserId: string,
  recipientMondayUserIds: string[],
  text: string
) {
  const requesterEmail = await getMondayUserEmail(requesterMondayUserId);

  return sendTeamsMessageFromEmail(
    requesterEmail,
    recipientMondayUserIds,
    text
  );
}

export async function getItemData(itemId: string) {
  const query = `
    query {
      items(ids: ${itemId}) {
        id
        name
        url
        created_at
        updated_at

        group {
          id
          title
        }

        creator {
          id
          name
          email
        }

        board {
          id
          name
        }

column_values {
  id
  text
  type
  value

  column {
    title
  }
}
      }
    }
  `;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();

  return data.data.items[0];
}