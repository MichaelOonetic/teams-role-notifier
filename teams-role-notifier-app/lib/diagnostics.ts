import { kv } from "@vercel/kv";

export type ExecutionDiagnostic = {
  id: string;
  date: string;

  boardId: string;
  automation: string;

  sender: {
    mode: string;
    email: string;
    fallbackUsed: boolean;
  };

  recipients: string[];
  cc: string[];

  success: boolean;
  error?: string;

  durationMs: number;
};

export async function saveExecution(
  diagnostic: ExecutionDiagnostic
) {
  const key =
    `teams-history:${diagnostic.boardId}`;

  const history =
    (await kv.get<
      ExecutionDiagnostic[]
    >(key)) || [];

  history.unshift(diagnostic);

  await kv.set(
    key,
    history.slice(0, 100)
  );
}

export async function getExecutionHistory(
  boardId: string
) {
  return (
    (await kv.get<
      ExecutionDiagnostic[]
    >(
      `teams-history:${boardId}`
    )) || []
  );
}

export async function getLastExecution(
  boardId: string
) {
  const history =
    await getExecutionHistory(
      boardId
    );

  return history[0] || null;
}