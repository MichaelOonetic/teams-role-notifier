import { NextRequest, NextResponse } from "next/server";

import {
  getExecutionHistory,
  getLastExecution,
  ExecutionDiagnostic,
} from "@/lib/diagnostics";

import { getMondayUsers } from "@/lib/teams";

function uniqueIdsFromDiagnostics(
  diagnostics: (ExecutionDiagnostic | null)[]
) {
  const ids = new Set<string>();

  for (const diagnostic of diagnostics) {
    if (!diagnostic) continue;

    for (const id of diagnostic.recipients || []) {
      ids.add(String(id));
    }
  }

  return Array.from(ids);
}

async function enrichDiagnostic(
  diagnostic: ExecutionDiagnostic | null
) {
  if (!diagnostic) return null;

  const users = await getMondayUsers(
    uniqueIdsFromDiagnostics([diagnostic])
  );

  const usersById = new Map(
    users.map((user) => [String(user.id), user])
  );

  return {
    ...diagnostic,
    recipientsDetails: diagnostic.recipients.map((id) => {
      const user = usersById.get(String(id));

      return {
        id: String(id),
        name: user?.name || String(id),
        email: user?.email || "",
      };
    }),
  };
}

async function enrichHistory(
  history: ExecutionDiagnostic[]
) {
  const users = await getMondayUsers(
    uniqueIdsFromDiagnostics(history)
  );

  const usersById = new Map(
    users.map((user) => [String(user.id), user])
  );

  return history.map((diagnostic) => ({
    ...diagnostic,
    recipientsDetails: diagnostic.recipients.map((id) => {
      const user = usersById.get(String(id));

      return {
        id: String(id),
        name: user?.name || String(id),
        email: user?.email || "",
      };
    }),
  }));
}

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get("boardId");

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

  const lastExecution = await getLastExecution(boardId);
  const history = await getExecutionHistory(boardId);

  return NextResponse.json({
    success: true,
    boardId,
    lastExecution: await enrichDiagnostic(lastExecution),
    history: await enrichHistory(history),
  });
}