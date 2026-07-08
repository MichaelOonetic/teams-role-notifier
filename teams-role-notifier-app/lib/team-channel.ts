import { getDelegatedAccessToken } from "./auth";

async function sendMessageToChannel(
  token: string,
  teamId: string,
  channelId: string,
  message: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
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
      `Send Teams channel message failed: ${JSON.stringify(
        data
      )}`
    );
  }

  return data;
}

async function findTeam(
  token: string,
  teamName: string
) {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/joinedTeams",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  const team = data.value.find(
    (t: any) =>
      t.displayName.toLowerCase() ===
      teamName.toLowerCase()
  );

  if (!team) {
    throw new Error(
      `Team "${teamName}" not found`
    );
  }

  return team.id;
}

async function findChannel(
  token: string,
  teamId: string,
  channelName: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  const channel = data.value.find(
    (c: any) =>
      c.displayName.toLowerCase() ===
      channelName.toLowerCase()
  );

  if (!channel) {
    throw new Error(
      `Channel "${channelName}" not found`
    );
  }

  return channel.id;
}

export async function sendTeamsChannelMessage(
  senderEmail: string,
  teamName: string,
  channelName: string,
  message: string
) {
  const token =
    await getDelegatedAccessToken(
      senderEmail
    );

  const teamId =
    await findTeam(
      token,
      teamName
    );

  const channelId =
    await findChannel(
      token,
      teamId,
      channelName
    );

  return sendMessageToChannel(
    token,
    teamId,
    channelId,
    message
  );
}