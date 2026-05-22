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
        scope: "openid profile offline_access User.Read Chat.ReadWrite ChatMessage.Send",
      }),
    }
  );

  return response.json();
}

export async function GET() {
  const tokenData = await getAccessToken();

  if (!tokenData.access_token) {
    return NextResponse.json({
      success: false,
      error: tokenData,
    });
  }

  const me = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  }).then((res) => res.json());

  return NextResponse.json({
    success: true,
    message: "Token Microsoft OK",
    user: {
      displayName: me.displayName,
      mail: me.mail,
      userPrincipalName: me.userPrincipalName,
    },
  });
}