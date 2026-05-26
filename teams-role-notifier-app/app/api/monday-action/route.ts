import { NextResponse } from "next/server";

async function getAccessToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN!;

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "openid profile offline_access User.Read Chat.ReadWrite ChatMessage.Send",
      }),
    }
  );

  return response.json();
}

async function sendTeamsMessageToUser(
  accessToken: string,
  targetEmail: string,
  message: string
) {
  const chatsResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats?$expand=members",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const chatsData = await chatsResponse.json();

  const targetChat = chatsData.value.find((chat: any) => {
    if (chat.chatType !== "oneOnOne") return false;

    return chat.members?.some(
      (member: any) =>
        member.email &&
        member.email.toLowerCase() === targetEmail.toLowerCase()
    );
  });

  if (!targetChat) {
    return {
      success: false,
      targetEmail,
      error: `Chat Teams privé introuvable pour ${targetEmail}`,
    };
  }

  const messageResponse = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${targetChat.id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: message,
        },
      }),
    }
  );

  const messageData = await messageResponse.json();

  return {
    success: !messageData.error,
    targetEmail,
    response: messageData,
  };
}

export async function POST(req: any) {
  const body = await req.json();

  console.log(
    "MONDAY ACTION PAYLOAD:",
    JSON.stringify(body, null, 2)
  );

  const boardId = body.payload.inputFields.board_id;
  const peopleColumnId = body.payload.inputFields.people_column;

  const mondayToken = process.env.MONDAY_API_TOKEN!;

  const itemQuery = `
    query {
      boards(ids: ${boardId}) {
        items_page(limit: 1) {
          items {
            id
            name
            url
            column_values(ids: ["${peopleColumnId}"]) {
              id
              text
              value
            }
          }
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
    body: JSON.stringify({
      query: itemQuery,
    }),
  });

  const mondayData = await mondayResponse.json();

  console.log(
    "MONDAY BOARD DATA:",
    JSON.stringify(mondayData, null, 2)
  );

  const item =
    mondayData.data.boards[0].items_page.items[0];

  const peopleColumn = item.column_values[0];

  if (!peopleColumn?.value) {
    return NextResponse.json({
      success: false,
      message: "Aucune personne trouvée",
    });
  }

  const parsedPeople = JSON.parse(peopleColumn.value);

  const mondayUserIds = parsedPeople.personsAndTeams
    .filter((p: any) => p.kind === "person")
    .map((p: any) => p.id);

  const userQuery = `
    query {
      users(ids: [${mondayUserIds.join(",")}]) {
        id
        name
        email
      }
    }
  `;

  const userResponse = await fetch(
    "https://api.monday.com/v2",
    {
      method: "POST",
      headers: {
        Authorization: mondayToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: userQuery,
      }),
    }
  );

  const userData = await userResponse.json();

  const tokenData = await getAccessToken();
  const accessToken = tokenData.access_token;

  const message = `
    🤖 Notification Teams automatique

    Item : ${item.name}

    ${item.url}
  `;

  const results = [];

  for (const user of userData.data.users) {
    if (!user.email) continue;

    const result = await sendTeamsMessageToUser(
      accessToken,
      user.email,
      message
    );

    results.push(result);
  }

  console.log(
    "TEAMS RESULTS:",
    JSON.stringify(results, null, 2)
  );

  return NextResponse.json({
    success: true,
    results,
  });
}