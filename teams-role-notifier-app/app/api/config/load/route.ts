import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json(
      { error: "Missing boardId" },
      { status: 400 }
    );
  }

  const config =
    (await kv.get<{
      senderMode?: string;
      senderColumn?: string;
      recipientColumn?: string;
      ccColumns?: string[];
      groupChats?: string[];
      template?: string;
      selectedTemplate?: string;
    }>(`teams-config:${boardId}`)) || {};

  return NextResponse.json({
    senderMode: config.senderMode || "configuredColumn",
    senderColumn: config.senderColumn || "",
    recipientColumn: config.recipientColumn || "",
    ccColumns: config.ccColumns || [],
    groupChats: config.groupChats || [],
    template: config.template || "",
    selectedTemplate: config.selectedTemplate || "",
  });
}