import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  const redirectUri =
    "https://teams-role-notifier.vercel.app/api/auth/microsoft/callback";

  const scopes = [
    "openid",
    "profile",
    "offline_access",
    "User.Read",
    "Chat.ReadWrite",
    "ChatMessage.Send",
  ].join(" ");

  const authUrl =
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scopes)}`;

  return NextResponse.redirect(authUrl);
}