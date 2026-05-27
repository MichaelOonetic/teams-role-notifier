import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing code" },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code"
      })
    }
  );

  const data = await response.json();

  console.log("MICROSOFT OAUTH CALLBACK:");
  console.log(data);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  const meResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const me = await meResponse.json();

  console.log("MICROSOFT ME:");
  console.log(me);

  await kv.set(
    `ms-refresh-token:${me.mail}`,
    refreshToken
  );

  console.log("REFRESH TOKEN SAVED");

  return NextResponse.json({
    success: true,
    message: "Microsoft account connected. You can close this page."
  });
}