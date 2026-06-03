import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest) {
  const body = await req.json();

const {
  boardId,
  senderColumn,
  recipientColumn,
  ccColumns,
  template,
  selectedTemplate,
} = body;

await kv.set(
  `teams-config:${boardId}`,
  {
    senderColumn,
    recipientColumn,
    ccColumns,
    template,
    selectedTemplate,
  }
);

  return NextResponse.json({
    success: true,
  });
}