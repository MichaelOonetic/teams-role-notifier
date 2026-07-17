import { NextRequest, NextResponse } from "next/server";

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
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.redirect(
      new URL("/?error=connection_failed", req.url)
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    return NextResponse.redirect(
      new URL("/?error=no_token", req.url)
    );
  }

  /*
   * Ici, le token est récupéré comme auparavant.
   * La logique de sauvegarde éventuelle reste inchangée.
   */

  return NextResponse.redirect(
    new URL("/?connected=true", req.url)
  );
}