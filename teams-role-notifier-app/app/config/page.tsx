"use client";

import { useState } from "react";

export default function ConfigPage() {
  const [senderColumn, setSenderColumn] =
    useState("Demandeur");

  const [recipientColumn, setRecipientColumn] =
    useState("Intégrateur");

  const [ccColumn, setCcColumn] =
    useState("Personnes à informer");

  const [message, setMessage] = useState(`
<b>Notification Monday</b>

<br><br>

<b>Ticket :</b> {item.name}

<br>

<a href="{item.url}">
Ouvrir l'item
</a>
`);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial"
      }}
    >
      <h1>
        Configuration Teams Notification
      </h1>

      <div
        style={{
          display: "grid",
          gap: 12,
          maxWidth: 600,
          marginTop: 24
        }}
      >

        <label>
          Colonne Demandeur
        </label>

        <input
          value={senderColumn}
          onChange={(e) =>
            setSenderColumn(
              e.target.value
            )
          }
        />

        <label>
          Colonne Intégrateur
        </label>

        <input
          value={recipientColumn}
          onChange={(e) =>
            setRecipientColumn(
              e.target.value
            )
          }
        />

        <label>
          Colonne CC
        </label>

        <input
          value={ccColumn}
          onChange={(e) =>
            setCcColumn(
              e.target.value
            )
          }
        />
      </div>

      <section
        style={{
          marginTop: 32
        }}
      >
        <label>
          <strong>
            Template Teams
          </strong>
        </label>

        <textarea
          value={message}
          onChange={(e) =>
            setMessage(
              e.target.value
            )
          }
          rows={12}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 12,
            fontFamily: "monospace"
          }}
        />
      </section>

      <section
        style={{
          marginTop: 32
        }}
      >
        <h2>Aperçu</h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: "#f7f7f7"
          }}
          dangerouslySetInnerHTML={{
            __html: message
              .replaceAll(
                "{item.name}",
                "Exemple ticket"
              )
              .replaceAll(
                "{item.url}",
                "https://monday.com"
              )
          }}
        />
      </section>
    </main>
  );
}