import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    boardId,
    senderColumn,
    recipientColumn,
    ccColumn,
    template,
  } = body;


  await kv.set(
    `teams-config:${boardId}`,
    {
      senderColumn,
      recipientColumn,
      ccColumn,
      template,
    }
  );

  const savedConfig = await kv.get(
  `teams-config:${boardId}`
);


  return NextResponse.json({
    success: true,
  });
}