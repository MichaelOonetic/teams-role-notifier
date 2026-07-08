export type MondayUser = {
  id: string;
  name: string;
  email: string;
};

export async function getMondayUsers(
  mondayUserIds: string[]
): Promise<MondayUser[]> {
  const ids = Array.from(
    new Set(mondayUserIds.filter(Boolean))
  );

  if (ids.length === 0) {
    return [];
  }

  const query = `
    query {
      users(ids: [${ids.join(",")}]) {
        id
        name
        email
      }
    }
  `;

  const response = await fetch(
    "https://api.monday.com/v2",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization:
          process.env.MONDAY_API_TOKEN!,
      },
      body: JSON.stringify({
        query,
      }),
    }
  );

  const data = await response.json();

  return (data.data?.users || []).map(
    (user: any) => ({
      id: String(user.id),
      name: user.name || "",
      email: user.email || "",
    })
  );
}

export async function getMondayUser(
  mondayUserId: string
): Promise<MondayUser | null> {
  const users =
    await getMondayUsers([
      mondayUserId,
    ]);

  return users[0] || null;
}

export async function getMondayUserEmail(
  mondayUserId: string
): Promise<string> {
  const user =
    await getMondayUser(
      mondayUserId
    );

  if (!user?.email) {
    throw new Error(
      `Monday user email not found: ${mondayUserId}`
    );
  }

  return user.email;
}

export async function getItemData(
  itemId: string
) {
  const query = `
    query {
      items(ids: ${itemId}) {
        id
        name
        url
        created_at
        updated_at

        group {
          id
          title
        }

        creator {
          id
          name
          email
        }

        board {
          id
          name
        }

        column_values {
          id
          text
          type
          value
        }
      }
    }
  `;

  const response = await fetch(
    "https://api.monday.com/v2",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization:
          process.env.MONDAY_API_TOKEN!,
      },
      body: JSON.stringify({
        query,
      }),
    }
  );

  const data = await response.json();

  return data.data.items[0];
}