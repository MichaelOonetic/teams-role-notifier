import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", req.url)
    );
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code",
        scope: [
          "openid",
          "profile",
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
    console.error("MICROSOFT TOKEN EXCHANGE FAILED", data);

    return NextResponse.redirect(
      new URL("/?error=connection_failed", req.url)
    );
  }

  if (!data.access_token) {
    return NextResponse.redirect(
      new URL("/?error=no_token", req.url)
    );
  }

  if (!data.refresh_token) {
    console.error("NO MICROSOFT REFRESH TOKEN RETURNED");

    return NextResponse.redirect(
      new URL("/?error=no_refresh_token", req.url)
    );
  }

  /*
   * Récupération de l'identité Microsoft réelle
   * de l'utilisateur connecté.
   */
  const meResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
    {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    }
  );

  const me = await meResponse.json();

  if (!meResponse.ok) {
    console.error("MICROSOFT /ME FAILED", me);

    return NextResponse.redirect(
      new URL("/?error=user_lookup_failed", req.url)
    );
  }

  const email =
    me.mail ||
    me.userPrincipalName;

  if (!email) {
    console.error("NO MICROSOFT EMAIL FOUND", me);

    return NextResponse.redirect(
      new URL("/?error=no_email", req.url)
    );
  }

  /*
   * Sauvegarde du refresh token dans Vercel KV.
   */
  await kv.set(
    `ms-refresh-token:${email.toLowerCase()}`,
    data.refresh_token
  );

  console.log(
    "MICROSOFT REFRESH TOKEN SAVED",
    email.toLowerCase()
  );

  return NextResponse.redirect(
    new URL(
      `/?connected=true&email=${encodeURIComponent(email)}`,
      req.url
    )
  );
}