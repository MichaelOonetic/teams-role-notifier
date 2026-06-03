import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

import { sendTeamsMessage } from "@/lib/teams";
import { getItemData } from "@/lib/teams";

function getPeopleIdsFromColumn(
  itemData: any,
  columnId?: string
) {
  if (!columnId) return [];

  const column =
    itemData?.column_values?.find(
      (value: any) =>
        value.id === columnId
    );

  if (!column?.value) return [];

  try {
    const parsed =
      JSON.parse(column.value);

    const people =
      parsed.personsAndTeams || [];

    return people
      .filter(
        (person: any) =>
          person.kind === "person"
      )
      .map(
        (person: any) =>
          String(person.id)
      );
  } catch {
    return [];
  }
}

export async function POST(
  req: NextRequest
) {
  const body = await req.json();

  const boardId = body.boardId;

  const config =
    await kv.get<any>(
      `teams-config:${boardId}`
    );

  if (!config) {
    return NextResponse.json(
      {
        error:
          "No configuration found",
      },
      {
        status: 400,
      }
    );
  }

  const query = `
    query {
      boards(ids: ${boardId}) {
        items_page(limit: 1) {
          items {
            id
          }
        }
      }
    }
  `;

  const response =
    await fetch(
      "https://api.monday.com/v2",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            process.env
              .MONDAY_API_TOKEN!,
        },
        body: JSON.stringify({
          query,
        }),
      }
    );

  const data =
    await response.json();

  const itemId =
    data.data.boards[0]
      .items_page.items[0].id;

  const itemData =
    await getItemData(itemId);

  const senderIds =
    getPeopleIdsFromColumn(
      itemData,
      config.senderColumn
    );

  const recipientIds = [
    ...getPeopleIdsFromColumn(
      itemData,
      config.recipientColumn
    ),
    ...(config.ccColumns || [])
      .flatMap(
        (columnId: string) =>
          getPeopleIdsFromColumn(
            itemData,
            columnId
          )
      ),
  ];

  const requesterId =
    senderIds[0];

  const message = `
<b>Notification Teams de test</b>

<br><br>

Board :
${itemData.board.name}

<br><br>

Item :
${itemData.name}

<br><br>

La configuration est correcte.
`;

  await sendTeamsMessage(
    requesterId,
    recipientIds,
    message
  );

  return NextResponse.json({
    success: true,
    message:
      "Notification de test envoyée",
  });
}