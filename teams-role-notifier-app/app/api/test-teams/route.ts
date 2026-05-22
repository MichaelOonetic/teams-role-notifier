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
  const tokenData = await getAccessToken();

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: tokenData,
    });
  }

  // Recherche de l'utilisateur Teams
  const me = await fetch("https://graph.microsoft.com/v1.0/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
}).then((res) => res.json());

  const userSearch = await fetch(
    "https://graph.microsoft.com/v1.0/users/mickael.chapusot@oonetic.com",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const targetUser = await userSearch.json();

  // Création du chat
  const chatResponse = await fetch(
    "https://graph.microsoft.com/v1.0/chats",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatType: "oneOnOne",
        members: [
        {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${me.id}`,
        },
        {
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${targetUser.id}`,
        },
        ],
      }),
    }
  );

  const chatData = await chatResponse.json();

  // Envoi du message
  const messageResponse = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatData.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          content:
            "🚀 Premier message Teams envoyé depuis monday + Vercel + Microsoft Graph",
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return NextResponse.json({
    success: true,
    chat: chatData,
    message: messageData,
  });
}