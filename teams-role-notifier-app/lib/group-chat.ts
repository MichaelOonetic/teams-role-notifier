import { getDelegatedAccessToken } from "./auth";

type TeamsMention = {
  id: number;
  mentionText: string;
  mentioned: {
    user: {
      id: string;
      displayName: string;
      userIdentityType: "aadUser";
    };
  };
};

async function getTeamsUserByEmail(
  token: string,
  email: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
      email
    )}?$select=id,displayName,mail,userPrincipalName`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Teams user "${email}" not found: ${JSON.stringify(data)}`
    );
  }

  return {
    id: data.id as string,
    displayName: data.displayName as string,
  };
}

async function prepareMessageWithMentions(
  token: string,
  message: string
): Promise<{
  content: string;
  mentions: TeamsMention[];
}> {
  const mentionPattern = /@\{([^}]+)\}/g;

  const matches = Array.from(
    message.matchAll(mentionPattern)
  );

  let content = message;
  const mentions: TeamsMention[] = [];

  for (let index = 0; index < matches.length; index++) {
    const fullMatch = matches[index][0];
    const email = matches[index][1].trim().toLowerCase();

    const user = await getTeamsUserByEmail(
      token,
      email
    );

    const mentionId = mentions.length;

    content = content.replace(
      fullMatch,
      `<at id="${mentionId}">${user.displayName}</at>`
    );

    mentions.push({
      id: mentionId,
      mentionText: user.displayName,
      mentioned: {
        user: {
          id: user.id,
          displayName: user.displayName,
          userIdentityType: "aadUser",
        },
      },
    });
  }

  return {
    content: content.replace(/\n/g, "<br>"),
    mentions,
  };
}

async function sendMessageToChat(
  token: string,
  chatId: string,
  message: string
) {
  const prepared =
    await prepareMessageWithMentions(
      token,
      message
    );

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
          content: prepared.content,
        },
        mentions: prepared.mentions,
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
  const normalizedTopic =
    topic.trim().toLowerCase();

  let url =
    "https://graph.microsoft.com/v1.0/me/chats?$top=50&$select=id,topic,chatType";

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `List chats failed: ${JSON.stringify(data)}`
      );
    }

    const chat = data.value.find(
      (c: any) =>
        c.chatType === "group" &&
        c.topic?.trim().toLowerCase() ===
          normalizedTopic
    );

    if (chat) {
      return chat.id;
    }

    url = data["@odata.nextLink"] || "";
  }

  throw new Error(
    `Teams group chat "${topic}" not found`
  );
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

  const chatId =
    await findGroupChat(
      token,
      chatName
    );

  return sendMessageToChat(
    token,
    chatId,
    message
  );
}

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