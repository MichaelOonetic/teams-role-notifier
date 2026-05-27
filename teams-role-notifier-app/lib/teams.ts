export async function sendTeamsMessage(
  text: string
) {

  await fetch(
    process.env.TEAMS_WEBHOOK_URL!,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text
      })
    }
  );

}