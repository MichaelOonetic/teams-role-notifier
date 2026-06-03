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

  console.log("SAVE CONFIG BODY:");
  console.log(JSON.stringify(body, null, 2));

  console.log("SAVE CONFIG KEY:");
  console.log(`teams-config:${boardId}`);

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

  console.log("SAVED CONFIG:");
  console.log(JSON.stringify(savedConfig, null, 2));

  return NextResponse.json({
    success: true,
  });
}