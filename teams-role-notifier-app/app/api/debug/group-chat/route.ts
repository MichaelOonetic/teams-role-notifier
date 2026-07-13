import { NextRequest, NextResponse } from "next/server";
import { getDelegatedAccessToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sender =
    req.nextUrl.searchParams.get("sender");

  if (!sender) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing sender parameter",
      },
      { status: 400 }
    );
  }

  try {
    const token =
      await getDelegatedAccessToken(sender);

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/chats?$select=id,topic,chatType",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        graphError: data,
      });
    }

    return NextResponse.json({
      success: true,
      sender,
      groups: data.value.filter(
        (chat: any) => chat.chatType === "group"
      ),
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