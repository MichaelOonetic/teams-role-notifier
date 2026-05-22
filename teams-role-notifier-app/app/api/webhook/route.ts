import { NextResponse } from "next/server";

async function getAccessToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN!;

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "openid profile offline_access User.Read Chat.ReadWrite ChatMessage.Send",
      }),
    }
  );

  return response.json();
}

async function sendTeamsMessageToUser(
  accessToken: string,
  targetEmail: string,
  message: string
) {
  const chatsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const chatsData = await chatsResponse.json();
  console.log(
  "ONE ON ONE CHATS:",
  JSON.stringify(
    chatsData.value
      .filter((chat: any) => chat.chatType === "oneOnOne")
      .map((chat: any) => ({
        id: chat.id,
        members: chat.members?.map((member: any) => ({
          displayName: member.displayName,
          email: member.email,
          userId: member.userId,
        })),
      })),
    null,
    2
  )
);

  const targetChat = chatsData.value.find((chat: any) => {
  if (chat.chatType !== "oneOnOne") return false;

  return chat.members?.some(
    (member: any) =>
      member.email &&
      member.email.toLowerCase() === targetEmail.toLowerCase()
  );
});

  if (!targetChat) {
    return {
      success: false,
      targetEmail,
      error: `Chat Teams privé introuvable pour ${targetEmail}`,
    };
  }

  const messageResponse = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${targetChat.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          content: message,
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return {
    success: !messageData.error,
    targetEmail,
    chatId: targetChat.id,
    response: messageData,
  };
}

async function sendTeamsMessageToGroup(
  accessToken: string,
  groupName: string,
  message: string
) {
  const chatsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const chatsData = await chatsResponse.json();

  const targetGroup = chatsData.value.find((chat: any) => {
    return chat.chatType === "group" && chat.topic === groupName;
  });

  if (!targetGroup) {
    return {
      success: false,
      groupName,
      error: `Groupe Teams introuvable : ${groupName}`,
    };
  }

  const messageResponse = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${targetGroup.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          content: message,
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return {
    success: !messageData.error,
    groupName,
    chatId: targetGroup.id,
    response: messageData,
  };
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook GET OK",
  });
}

export async function POST(req: any) {
  const body = await req.json();

  if (body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  const event = body.event;
  const pulseId = event.pulseId;
  const mondayToken = process.env.MONDAY_API_TOKEN!;

  const itemQuery = `
    query {
      items(ids: ${pulseId}) {
        id
        name
        url
        column_values {
          id
          text
          value
          type
          column {
            title
          }
        }
      }
    }
  `;

  const mondayResponse = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: mondayToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: itemQuery }),
  });

  const mondayData = await mondayResponse.json();
  const item = mondayData.data.items[0];
  console.log(
  "ALL COLUMNS:",
  JSON.stringify(item.column_values, null, 2)
  );
  const roleColumnNames = ["Demandeur", "Leader", "Intégrateur"];
  const mondayUserIds: number[] = [];

  for (const col of item.column_values) {
    const columnTitle = col.column?.title;

    if (col.type !== "people") continue;
    if (!roleColumnNames.includes(columnTitle)) continue;
    if (!col.value) continue;

    const parsed = JSON.parse(col.value);

    if (!parsed.personsAndTeams) continue;

    for (const person of parsed.personsAndTeams) {
      if (person.kind === "person") {
        mondayUserIds.push(person.id);
      }
    }
  }

  const uniqueUserIds = [...new Set(mondayUserIds)];

  if (uniqueUserIds.length === 0) {
    return NextResponse.json({
      success: false,
      message:
        "Aucun utilisateur trouvé dans les colonnes Demandeur, Leader ou Intégrateur",
    });
  }

  const userQuery = `
    query {
      users(ids: [${uniqueUserIds.join(",")}]) {
        id
        name
        email
      }
    }
  `;

  const userResponse = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: mondayToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: userQuery }),
  });

  const userData = await userResponse.json();
  const targetUsers = userData.data.users;

  const tokenData = await getAccessToken();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({
      success: false,
      message: "Token Microsoft impossible à récupérer",
      error: tokenData,
    });
  }

  const statusText =
    item.column_values.find((col: any) => col.id === "status")?.text ||
    event.value?.label?.text ||
    "Statut inconnu";

  const message = `🤖 Notification automatique monday

Déclenchée par : utilisateur monday ${event.userId}

Item : ${item.name}
Statut : ${statusText}

${item.url}`;

  const results = [];

  for (const user of targetUsers) {
    if (!user.email) continue;

    const result = await sendTeamsMessageToUser(
      accessToken,
      user.email,
      message
    );

    results.push(result);
  }

  console.log("TEAMS NOTIFICATION RESULTS:", JSON.stringify(results, null, 2));

  return NextResponse.json({
    success: true,
    recipients: targetUsers.map((user: any) => ({
      name: user.name,
      email: user.email,
    })),
    results,
  });
}