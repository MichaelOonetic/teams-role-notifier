import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    response_mode: "query",
scope: [
  "offline_access",
  "User.Read",
  "User.ReadBasic.All",
  "Chat.ReadWrite",
  "Chat.Create",
  "ChatMessage.Send"
].join(" ")
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params}`
  );
}