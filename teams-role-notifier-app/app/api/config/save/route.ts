import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    boardId,
    senderMode,
    senderColumn,
    recipientColumn,
    ccColumns,
    groupChats = [],
    template,
    selectedTemplate,
  } = body;

  await kv.set(
    `teams-config:${boardId}`,
    {
      senderColumn,
      senderMode,
      recipientColumn,
      ccColumns,
      groupChats,
      template,
      selectedTemplate,
    }
  );

  return NextResponse.json({
    success: true,
  });
}