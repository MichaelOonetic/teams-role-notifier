import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

type ConnectionStatus = {
  email: string;
  name: string;
  status: "healthy" | "expired" | "missing" | "error";
  message: string;
};

function getDisplayName(email: string) {
  const localPart = email.split("@")[0] || email;

  return localPart
    .split(/[._-]/)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1).toLowerCase()
    )
    .join(" ");
}

async function testRefreshToken(
  email: string,
  refreshToken: string
): Promise<ConnectionStatus> {
  try {
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

    if (response.ok && data.access_token) {
      /*
       * Microsoft peut renvoyer un nouveau refresh token.
       * On le sauvegarde afin de maintenir la rotation.
       */
      if (data.refresh_token) {
        await kv.set(
          `ms-refresh-token:${email}`,
          data.refresh_token
        );
      }

      return {
        email,
        name: getDisplayName(email),
        status: "healthy",
        message: "Connexion Microsoft opérationnelle",
      };
    }

    const errorCode = String(data.error || "");
    const description = String(data.error_description || "");

    if (
      errorCode === "invalid_grant" ||
      description.includes("AADSTS700082") ||
      description.toLowerCase().includes("expired") ||
      description.toLowerCase().includes("revoked")
    ) {
      return {
        email,
        name: getDisplayName(email),
        status: "expired",
        message:
          "Connexion Microsoft expirée — Reconnexion nécessaire",
      };
    }

    return {
      email,
      name: getDisplayName(email),
      status: "error",
      message: "Connexion Microsoft en erreur",
    };
  } catch (error) {
    console.error(
      "MICROSOFT HEALTH CHECK FAILED",
      email,
      error
    );

    return {
      email,
      name: getDisplayName(email),
      status: "error",
      message: "Impossible de vérifier la connexion Microsoft",
    };
  }
}

export async function GET() {
  const connections: ConnectionStatus[] = [];

  for await (const key of kv.scanIterator({
    match: "ms-refresh-token:*",
  })) {
    const keyString = String(key);

    const email = keyString
      .replace("ms-refresh-token:", "")
      .toLowerCase();

    const refreshToken =
      await kv.get<string>(keyString);

    if (!refreshToken) {
      connections.push({
        email,
        name: getDisplayName(email),
        status: "missing",
        message: "Compte Microsoft non connecté",
      });

      continue;
    }

    const status = await testRefreshToken(
      email,
      refreshToken
    );

    connections.push(status);
  }

  connections.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return NextResponse.json({
    connections,
  });
}