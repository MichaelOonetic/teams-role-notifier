"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

type Column = {
  id: string;
  title: string;
  type: string;
};

export default function ConfigPage() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);

  const [senderColumn, setSenderColumn] = useState("");
  const [recipientColumn, setRecipientColumn] = useState("");
  const [ccColumn, setCcColumn] = useState("");

  const [message, setMessage] = useState(
    `<b>Notification Monday</b>

<br><br>

<b>Ticket :</b> {item.name}

<br>

<a href="{item.url}">Ouvrir l'item</a>`
  );

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;
      const id = data?.boardId;

      if (id) {
        setBoardId(id);
      }
    });
  }, []);

  useEffect(() => {
    if (!boardId) return;

    fetch(`/api/monday/columns?boardId=${boardId}`)
      .then((res) => res.json())
      .then((data) => {
        const boardColumns = data.data?.boards?.[0]?.columns || [];
        setColumns(boardColumns);
      });
  }, [boardId]);

  const peopleColumns = columns.filter(
    (column) => column.type === "people"
  );

  console.log("COLUMNS", columns);
  console.log("PEOPLE COLUMNS", peopleColumns);

  return (
    <main style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>Configuration Teams Notification</h1>

      <p>
        <strong>Board ID :</strong> {boardId || "chargement..."}
      </p>

      <section style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <label>Colonne expéditeur</label>
        <select
          value={senderColumn}
          onChange={(e) => setSenderColumn(e.target.value)}
        >
          <option value="">Choisir une colonne</option>
          {peopleColumns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>

        <label>Colonne destinataire principal</label>
        <select
          value={recipientColumn}
          onChange={(e) => setRecipientColumn(e.target.value)}
        >
          <option value="">Choisir une colonne</option>
          {peopleColumns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>

        <label>Colonne CC</label>
        <select
          value={ccColumn}
          onChange={(e) => setCcColumn(e.target.value)}
        >
          <option value="">Aucune</option>
          {peopleColumns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
      </section>

      <section style={{ marginTop: 32 }}>
        <label>
          <strong>Template Teams</strong>
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

      <section style={{ marginTop: 32 }}>
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
              .replaceAll("{item.url}", "https://monday.com"),
          }}
        />
      </section>
    </main>
  );
}