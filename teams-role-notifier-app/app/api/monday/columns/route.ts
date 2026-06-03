import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const boardId = req.nextUrl.searchParams.get("boardId");

  if (!boardId) {
    return NextResponse.json(
      { error: "Missing boardId" },
      { status: 400 }
    );
  }

  const query = `
    query {
      boards(ids: ${boardId}) {
        id
        name
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN!,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  
  console.log("MONDAY COLUMNS:");
  console.log(JSON.stringify(data, null, 2));

  return NextResponse.json(data);
}