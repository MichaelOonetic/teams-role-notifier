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
          contentType: "html",
          content: message,
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return {
    success: !messageData.error,
    targetEmail,
    response: messageData,
  };
}

export async function POST(req: any) {
  const body = await req.json();

  console.log(
    "MONDAY ACTION PAYLOAD:",
    JSON.stringify(body, null, 2)
  );

  return NextResponse.json({
    success: true,
  });
}