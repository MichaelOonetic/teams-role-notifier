import { getDelegatedAccessToken } from "./auth";

async function sendMessageToChat(
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: message.replace(/\n/g, "<br>"),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Send Teams message failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function findGroupChat(
  token: string,
  topic: string
) {
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
      `List chats failed: ${JSON.stringify(data)}`
    );
  }

  console.log(
  "AVAILABLE GROUP CHATS",
  JSON.stringify(
    data.value.map((c: any) => ({
      id: c.id,
      topic: c.topic,
      chatType: c.chatType,
    })),
    null,
    2
  )
);

const normalizedTopic = topic.trim().toLowerCase();

const chat = data.value.find(
  (c: any) =>
    c.chatType === "group" &&
    c.topic?.trim().toLowerCase() === normalizedTopic
);

  if (!chat) {
    throw new Error(
      `Teams group chat "${topic}" not found`
    );
  }

  return chat.id;
}

export async function sendTeamsGroupChatMessage(
  senderEmail: string,
  chatName: string,
  message: string
) {
  const token =
    await getDelegatedAccessToken(
      senderEmail
    );

    console.log("========== GROUP CHAT ==========");
console.log("Sender :", senderEmail);
console.log("Chat :", chatName);
console.log("================================");

    const me = await fetch(
  "https://graph.microsoft.com/v1.0/me",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

console.log(
  "GRAPH USER",
  await me.text()
);

  const chatId =
    await findGroupChat(
      token,
      chatName
    );

  console.log("Chat trouvé :", chatId);  

const result = await sendMessageToChat(
  token,
  chatId,
  message
);

console.log("Message envoyé");

return result;

export async function sendTeamsGroupChatMessages(
  senderEmail: string,
  chatNames: string[],
  message: string
) {
  const results = [];

  for (const chatName of chatNames) {
    try {
      await sendTeamsGroupChatMessage(
        senderEmail,
        chatName,
        message
      );

      results.push({
        chat: chatName,
        success: true,
      });
    } catch (error) {
      console.error(
        `GROUP CHAT FAILED (${chatName})`,
        error
      );

      results.push({
        chat: chatName,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }

  return results;
}