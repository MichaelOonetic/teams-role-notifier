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

  // Liste des chats existants
  const chatsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const chatsData = await chatsResponse.json();

  // Recherche du chat avec Mickael
  const targetChat = chatsData.value.find((chat: any) =>
    chat.members?.some((member: any) =>
      member.email?.toLowerCase() ===
      "mickael.chapusot@oonetic.com"
    )
  );

  if (!targetChat) {
    return NextResponse.json({
      success: false,
      message: "Chat Teams avec Mickael introuvable",
      chats: chatsData,
    });
  }

  // Envoi du message
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
          content:
            "🚀 Premier message Teams envoyé automatiquement depuis monday + Vercel + Microsoft Graph",
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return NextResponse.json({
    success: true,
    chatId: targetChat.id,
    message: messageData,
  });
}