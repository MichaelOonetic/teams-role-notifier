async function getAccessToken() {
  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  const data = await response.json();
  return data.access_token;
}

async function getMondayUserEmail(mondayUserId: string) {
  const query = `
    query {
      users(ids: ${mondayUserId}) {
        email
        name
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
  return data.data.users[0].email;
}

async function getTeamsUserId(token: string, email: string) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${email}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  console.log("GRAPH USER:");
  console.log(data);

  return data.id;
}

async function createChat(
  token: string,
  targetUserId: string
) {
  const senderEmail = process.env.TEAMS_SENDER_EMAIL!;

  const senderUserId = await getTeamsUserId(
    token,
    senderEmail
  );

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/chats",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chatType: "oneOnOne",
        members: [
          {
            "@odata.type":
              "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind":
              `https://graph.microsoft.com/v1.0/users('${senderUserId}')`
          },
          {
            "@odata.type":
              "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind":
              `https://graph.microsoft.com/v1.0/users('${targetUserId}')`
          }
        ]
      })
    }
  );

  const data = await response.json();

  console.log("CREATE CHAT RESPONSE:");
  console.log(data);

  if (!response.ok) {
    throw new Error(
      `Create chat failed: ${JSON.stringify(data)}`
    );
  }

  return data.id;
}

async function sendMessageToChat(
  token: string,
  chatId: string,
  text: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: text.replace(/\n/g, "<br>")
        }
      })
    }
  );

  const data = await response.json();

  console.log("SEND MESSAGE RESPONSE:");
  console.log(data);

  if (!response.ok) {
    throw new Error(
      `Send message failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function sendTeamsMessage(mondayUserId: string, text: string) {
  const token = await getAccessToken();

  const email = await getMondayUserEmail(mondayUserId);

  console.log("MONDAY EMAIL:");
  console.log(email);

  const teamsUserId = await getTeamsUserId(token, email);

  console.log("TEAMS USER:");
  console.log(teamsUserId);

  const chatId = await createChat(token, teamsUserId);

  console.log("CHAT ID:");
  console.log(chatId);

  await sendMessageToChat(token, chatId, text);

  console.log("MESSAGE SENT");
}