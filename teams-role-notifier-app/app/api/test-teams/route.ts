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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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

  const personColumn = item.column_values.find(
    (col: any) => col.type === "people"
  );

  if (!personColumn || !personColumn.value) {
    return NextResponse.json({
      success: false,
      message: "Aucune personne trouvée dans l’item monday",
    });
  }

  const peopleValue = JSON.parse(personColumn.value);
  const mondayUserId = peopleValue.personsAndTeams[0].id;

  const userQuery = `
    query {
      users(ids: ${mondayUserId}) {
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
  const targetEmail = userData.data.users[0].email;

  const tokenData = await getAccessToken();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({
      success: false,
      message: "Token Microsoft impossible à récupérer",
      error: tokenData,
    });
  }

  const chatsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const chatsData = await chatsResponse.json();

  const targetChat = chatsData.value.find((chat: any) => {
    if (chat.chatType !== "oneOnOne") return false;

    return chat.members?.some(
      (member: any) =>
        member.email &&
        member.email.toLowerCase() === targetEmail.toLowerCase()
    );
  });

  if (!targetChat) {
    return NextResponse.json({
      success: false,
      message: `Chat Teams privé introuvable pour ${targetEmail}`,
    });
  }

  const statusText =
    item.column_values.find((col: any) => col.id === "status")?.text ||
    event.value?.label?.text ||
    "Statut inconnu";

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
          content: `🤖 Notification automatique monday

Déclenchée par : utilisateur monday ${event.userId}

Item : ${item.name}
Statut : ${statusText}

${item.url}`,
        },
      }),
    }
  );

  const messageData = await messageResponse.json();
  console.log("TARGET EMAIL:", targetEmail);
  console.log("TARGET CHAT:", targetChat?.id);
  console.log("TEAMS MESSAGE RESPONSE:", JSON.stringify(messageData, null, 2));

  return NextResponse.json({
    success: true,
    sentTo: targetEmail,
    item: item.name,
    message: messageData,
  });
}