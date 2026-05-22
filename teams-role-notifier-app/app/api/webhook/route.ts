import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook GET OK",
  });
}

export async function POST(req: any) {
  const body = await req.json();

  const event = body.event;

  const boardId = event.boardId;
  const pulseId = event.pulseId;

  const mondayToken = process.env.MONDAY_API_TOKEN!;

  const query = `
    query {
      items(ids: ${pulseId}) {
        id
        name
        url
        column_values {
          id
          text
          value
          type
        }
      }
    }
  `;

  const mondayResponse = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: mondayToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const mondayData = await mondayResponse.json();

  console.log(
    "MONDAY ITEM DETAILS:",
    JSON.stringify(mondayData, null, 2)
  );

  return NextResponse.json({
    success: true,
  });
}