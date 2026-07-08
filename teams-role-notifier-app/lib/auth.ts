import { kv } from "@vercel/kv";

export async function getAccessTokenFromRefreshToken(
  refreshToken: string
): Promise<string> {
  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret:
          process.env.AZURE_CLIENT_SECRET!,
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
      `Refresh token failed: ${JSON.stringify(
        data
      )}`
    );
  }

  return data.access_token;
}

export async function getDelegatedAccessToken(
  senderEmail: string
): Promise<string> {
  const refreshToken =
    await kv.get<string>(
      `ms-refresh-token:${senderEmail.toLowerCase()}`
    );

  if (!refreshToken) {
    throw new Error(
      `No refresh token found for ${senderEmail}`
    );
  }

  return getAccessTokenFromRefreshToken(
    refreshToken
  );
}