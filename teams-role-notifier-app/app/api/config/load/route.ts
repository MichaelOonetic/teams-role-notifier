import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: NextRequest) {
  const boardId =
    req.nextUrl.searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json(
      { error: "Missing boardId" },
      { status: 400 }
    );
  }

  const config = await kv.get(
    `teams-config:${boardId}`
  );

  return NextResponse.json(config || {});
}