import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import { sendTeamsMessage } from "@/lib/teams";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const boardId = body.boardId;

  const config = await kv.get<any>(
    `teams-config:${boardId}`
  );

  if (!config) {
    return NextResponse.json(
      {
        error: "No configuration found",
      },
      { status: 400 }
    );
  }

  const testMessage = `
<b>Notification Teams de test</b>

<br><br>

Board ID : ${boardId}

<br><br>

La configuration est opérationnelle.
`;

  return NextResponse.json({
    success: true,
    message:
      "Test endpoint ready",
  });
}