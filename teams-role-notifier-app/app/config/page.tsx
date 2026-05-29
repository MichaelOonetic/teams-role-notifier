"use client";

import { useState } from "react";

export default function ConfigPage() {
  const [message, setMessage] = useState(
    `<b>Notification Monday</b>

<br><br>

<b>Ticket :</b> {item.name}

<br>

<a href="{item.url}">Ouvrir l'item</a>`
  );

  return (
    <main style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>Configuration Teams Notification</h1>

      <section style={{ marginTop: 24 }}>
        <label>
          <strong>Template du message Teams</strong>
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 12,
            fontFamily: "monospace",
          }}
        />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Aperçu</h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: "#f7f7f7",
          }}
          dangerouslySetInnerHTML={{
            __html: message
              .replaceAll("{item.name}", "Exemple ticket")
              .replaceAll("{item.url}", "https://monday.com/example"),
          }}
        />
      </section>
    </main>
  );
}