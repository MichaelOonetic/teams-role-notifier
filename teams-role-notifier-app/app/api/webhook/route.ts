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

  const item = mondayData.data.items[0];

const personColumn = item.column_values.find(
  (col: any) => col.type === "people"
);

const peopleValue = JSON.parse(personColumn.value);

const mondayUserId = peopleValue.personsAndTeams[0].id;

// Récupération de l'utilisateur monday
const userQuery = `
  query {
    users(ids: ${mondayUserId}) {
      id
      name
      email
    }
  }
`;

const userResponse = await fetch("https://api.monday.com/v2", {
  method: "POST",
  headers: {
    Authorization: mondayToken,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: userQuery }),
});

const userData = await userResponse.json();

console.log(
  "MONDAY USER:",
  JSON.stringify(userData, null, 2)
);

  console.log(
    "MONDAY ITEM DETAILS:",
    JSON.stringify(mondayData, null, 2)
  );

  return NextResponse.json({
    success: true,
  });
}