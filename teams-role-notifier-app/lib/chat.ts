export async function getTeamsUserId(
  token: string,
  email: string
): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${email}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Get Teams user failed: ${JSON.stringify(
        data
      )}`
    );
  }

  return data.id;
}

export async function createOrGetOneOnOneChat(
  token: string,
  senderUserId: string,
  targetUserId: string
): Promise<string> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/chats",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        chatType: "oneOnOne",
        members: [
          {
            "@odata.type":
              "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind":
              `https://graph.microsoft.com/v1.0/users('${senderUserId}')`,
          },
          {
            "@odata.type":
              "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind":
              `https://graph.microsoft.com/v1.0/users('${targetUserId}')`,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Create chat failed: ${JSON.stringify(
        data
      )}`
    );
  }

  return data.id;
}

export async function getGroupChatId(
  token: string,
  chatName: string
): Promise<string> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/chats",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `List chats failed: ${JSON.stringify(
        data
      )}`
    );
  }

  const chat = data.value.find(
    (c: any) =>
      c.chatType === "group" &&
      c.topic?.toLowerCase() ===
        chatName.toLowerCase()
  );

  if (!chat) {
    throw new Error(
      `Teams group chat not found: ${chatName}`
    );
  }

  return chat.id;
}

export async function sendMessageToChat(
  token: string,
  chatId: string,
  message: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: message.replace(
            /\n/g,
            "<br>"
          ),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Send message failed: ${JSON.stringify(
        data
      )}`
    );
  }

  return data;
}