async function getAccessToken() {

  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id:
          process.env.AZURE_CLIENT_ID!,
        client_secret:
          process.env.AZURE_CLIENT_SECRET!,
        scope:
          "https://graph.microsoft.com/.default",
        grant_type:
          "client_credentials"
      })
    }
  );

  const data = await response.json();

  console.log("ACCESS TOKEN:");
  console.log(data);

  return data.access_token;
}

export async function sendTeamsMessage(
  text: string
) {

  const token = await getAccessToken();

  console.log("TOKEN OK");
  console.log(token);

}