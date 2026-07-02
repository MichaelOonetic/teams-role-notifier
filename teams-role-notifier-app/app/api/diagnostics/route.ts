import { NextRequest, NextResponse } from "next/server";

import {
  getExecutionHistory,
  getLastExecution,
} from "@/lib/diagnostics";

export async function GET(req: NextRequest) {
  const boardId =
    req.nextUrl.searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing boardId",
      },
      {
        status: 400,
      }
    );
  }

  const lastExecution =
    await getLastExecution(boardId);

  const history =
    await getExecutionHistory(boardId);

  return NextResponse.json({
    success: true,
    boardId,
    lastExecution,
    history,
  });
}