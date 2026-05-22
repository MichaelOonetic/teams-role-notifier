import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code Microsoft manquant" }, { status: 400 });
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  const redirectUri =
    "https://teams-role-notifier.vercel.app/api/auth/microsoft/callback";

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );

const tokenData = await tokenResponse.json();

if (!tokenData.access_token) {
  return NextResponse.json({
    success: false,
    message: "Microsoft n'a pas renvoyé de token",
    error: tokenData.error,
    error_description: tokenData.error_description,
  });
}

return NextResponse.json({
  success: true,
  message: "Microsoft connecté",
});
}