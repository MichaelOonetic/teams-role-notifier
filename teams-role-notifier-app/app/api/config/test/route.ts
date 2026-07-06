import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import { sendTeamsMessage, getItemData } from "@/lib/teams";

function getPeopleIdsFromColumn(itemData: any, columnId?: string) {
  if (!columnId) return [];

  const column = itemData?.column_values?.find(
    (value: any) => value.id === columnId
  );

  if (!column?.value) return [];

  try {
    const parsed = JSON.parse(column.value);

    const people =
      parsed.personsAndTeams ||
      parsed.persons_and_teams ||
      [];

    return people
      .filter((person: any) => person.kind === "person")
      .map((person: any) => String(person.id));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const { boardId } = await req.json();

  const config = await kv.get<any>(`teams-config:${boardId}`);

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        checks: {
          configuration: false,
        },
        message: "Aucune configuration trouvée.",
      },
      { status: 400 }
    );
  }

  const query = `
    query {
      boards(ids: ${boardId}) {
        name
        items_page(limit: 1) {
          items {
            id
          }
        }
      }
    }
  `;

  const response = await fetch(
    "https://api.monday.com/v2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.MONDAY_API_TOKEN!,
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await response.json();

  const itemId =
    data.data.boards[0].items_page.items[0]?.id;

  if (!itemId) {
    return NextResponse.json(
      {
        success: false,
        checks: {
          board: true,
          item: false,
        },
        message: "Aucun élément trouvé sur ce board.",
      },
      { status: 400 }
    );
  }

  const itemData = await getItemData(itemId);

  const senderIds = getPeopleIdsFromColumn(
    itemData,
    config.senderColumn
  );

  const recipientIds = [
    ...getPeopleIdsFromColumn(
      itemData,
      config.recipientColumn
    ),
    ...(config.ccColumns || []).flatMap((columnId: string) =>
      getPeopleIdsFromColumn(itemData, columnId)
    ),
  ];

  const checks = {
    configuration: true,
    senderColumn: !!config.senderColumn,
    recipientColumn: !!config.recipientColumn,
    senderFound: senderIds.length > 0,
    recipientFound: recipientIds.length > 0,
  };

  if (
    !checks.senderFound ||
    !checks.recipientFound
  ) {
    return NextResponse.json(
      {
        success: false,
        checks,
        message:
          "Configuration incomplète. Vérifiez les colonnes People.",
      },
      { status: 400 }
    );
  }

  const message = `
<b>🧪 Notification Teams de test</b>

<br><br>

Board :
${itemData.board.name}

<br><br>

Item :
${itemData.name}

<br><br>

La configuration Teams est valide.
`;

  await sendTeamsMessage(
    senderIds[0],
    recipientIds,
    message
  );

  return NextResponse.json({
    success: true,
    checks,
    message:
      "Configuration valide. Notification de test envoyée.",
  });
}