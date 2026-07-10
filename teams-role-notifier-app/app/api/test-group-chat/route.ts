import { NextRequest, NextResponse } from "next/server";

import { sendTeamsGroupChatMessage } from "@/lib/group-chat";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const senderEmail =
    req.nextUrl.searchParams.get("sender");

  const chat =
    req.nextUrl.searchParams.get("chat");

  if (!senderEmail || !chat) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing sender or chat parameter",
      },
      {
        status: 400,
      }
    );
  }

  try {
    await sendTeamsGroupChatMessage(
      senderEmail,
      chat,
      "Test Teams Role Notifier"
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}