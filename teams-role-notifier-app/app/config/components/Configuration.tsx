"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

type Column = {
  id: string;
  title: string;
  type: string;
};

const templates = {
  statusChanged: `<b>Changement de statut</b>

<br><br>

<b>Ticket :</b> {item.name}

<br>

<a href="{item.url}">
Ouvrir l&apos;item
</a>`,

  columnChanged: `<b>Modification de colonne</b>

<b>Ticket :</b> {item.name}

Une valeur a été modifiée.

<a href="{item.url}">
Ouvrir l&apos;item
</a>`,

  itemCreated: `<b>Nouvel élément créé</b>

<b>Ticket :</b> {item.name}

<b>Board :</b> {board.name}

<a href="{item.url}">
Ouvrir l&apos;item
</a>`,

  updateCreated: `<b>Nouveau commentaire</b>

<b>Ticket :</b> {item.name}

{update.body}

<a href="{item.url}">
Ouvrir l&apos;item
</a>`,

  subitemStatusChanged: `<b>Changement de statut d&apos;un sous-élément</b>

<b>Sous-élément :</b> {subitem.name}

{previousStatus}
→
{currentStatus}

<a href="{item.url}">
Ouvrir l&apos;élément parent
</a>`,
};

export default function Configuration() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);

  const [senderColumn, setSenderColumn] = useState("");
  const [recipientColumn, setRecipientColumn] = useState("");
  const [senderMode, setSenderMode] = useState("configuredColumn");
  const [ccColumns, setCcColumns] = useState<string[]>([]);
  const [groupChats, setGroupChats] = useState<string[]>([]);
  const [groupChatInput, setGroupChatInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [message, setMessage] = useState(templates.statusChanged);

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

    fetch(`/api/config/load?boardId=${boardId}`)
      .then((res) => res.json())
      .then((config) => {
        if (config.senderMode) {
          setSenderMode(config.senderMode);
        }

        if (config.senderColumn) {
          setSenderColumn(config.senderColumn);
        }

        if (config.recipientColumn) {
          setRecipientColumn(config.recipientColumn);
        }

        if (config.ccColumns) {
          setCcColumns(config.ccColumns);
        }

        if (config.groupChats) {
  setGroupChats(config.groupChats);
}

        if (config.template) {
          setMessage(config.template);
        }

        if (config.selectedTemplate) {
          setSelectedTemplate(config.selectedTemplate);
        }
      });
  }, [boardId]);

  const peopleColumns = columns.filter((column) => column.type === "people");

  function toggleCcColumn(columnId: string) {
    setCcColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    );
  }

  function applyTemplate(value: string) {
    setSelectedTemplate(value);

    if (value in templates) {
      setMessage(templates[value as keyof typeof templates]);
    }
  }

  function addGroupChat() {
  const value = groupChatInput.trim();

  if (!value) {
    return;
  }

  if (groupChats.includes(value)) {
    setGroupChatInput("");
    return;
  }

  setGroupChats([...groupChats, value]);
  setGroupChatInput("");
}

function removeGroupChat(chatName: string) {
  setGroupChats(
    groupChats.filter((name) => name !== chatName)
  );
}

  return (
    <main>
      <h1>⚙ Configuration</h1>

      <p>
        <strong>Board ID :</strong> {boardId || "chargement..."}
      </p>

      <section style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <label>Mode expéditeur</label>

        <select
          value={senderMode}
          onChange={(e) => setSenderMode(e.target.value)}
        >
          <option value="configuredColumn">Colonne configurée</option>
          <option value="triggeredBy">Auteur de l&apos;action</option>
        </select>

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

        <label>Colonnes CC</label>

        <div style={{ display: "grid", gap: 8 }}>
          {peopleColumns
            .filter(
              (column) =>
                column.id !== senderColumn &&
                column.id !== recipientColumn
            )
            .map((column) => (
              <label key={column.id}>
                <input
                  type="checkbox"
                  checked={ccColumns.includes(column.id)}
                  onChange={() => toggleCcColumn(column.id)}
                />{" "}
                {column.title}
              </label>
            ))}
        </div>
</section>

      <section
        style={{
          marginTop: 32,
          maxWidth: 600,
          display: "grid",
          gap: 12,
        }}
      >
        <label>
          <strong>🟢 TEST CHATS TEAMS 🟢</strong>
        </label>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="SUPPORT x OPS"
            value={groupChatInput}
            onChange={(e) =>
              setGroupChatInput(e.target.value)
            }
            style={{
              flex: 1,
              padding: 8,
            }}
          />

<button
  type="button"
  onClick={() => {
    console.log("CLICK");
    addGroupChat();
  }}
>
  Ajouter
</button>
        </div>

        {groupChats.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {groupChats.map((chat) => (
              <div
                key={chat}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                <span>{chat}</span>

                <button
                  type="button"
                  onClick={() => removeGroupChat(chat)}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32, maxWidth: 600 }}>
        <label>
          <strong>Bibliothèque de modèles</strong>
        </label>

        <select
          value={selectedTemplate}
          onChange={(e) => applyTemplate(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: 8,
          }}
        >
          <option value="">Choisir un modèle</option>
          <option value="itemCreated">📋 Item créé</option>
          <option value="updateCreated">💬 Nouveau commentaire</option>
          <option value="statusChanged">🔄 Changement de statut</option>
          <option value="columnChanged">📝 Modification de colonne</option>
          <option value="subitemStatusChanged">
            🧩 Statut de sous-élément
          </option>
        </select>
      </section>


      <section
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#f7f7f7",
          maxWidth: 600,
        }}
      >
        <strong>Configuration active</strong>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <div>
            Expéditeur :{" "}
            {peopleColumns.find((c) => c.id === senderColumn)?.title || "-"}
          </div>

          <div>
            Destinataire :{" "}
            {peopleColumns.find((c) => c.id === recipientColumn)?.title || "-"}
          </div>

          <div>
            CC :{" "}
            {peopleColumns
              .filter((c) => ccColumns.includes(c.id))
              .map((c) => c.title)
              .join(", ") || "-"}
          </div>
          <div>
  Chats Teams :{" "}
  {groupChats.length > 0
    ? groupChats.join(", ")
    : "-"}
</div>

          <div>Modèle : {selectedTemplate || "-"}</div>
        </div>
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
        <button
          onClick={async () => {
            await fetch("/api/config/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
body: JSON.stringify({
  boardId,
  senderMode,
  senderColumn,
  recipientColumn,
  ccColumns,
  groupChats,
  template: message,
  selectedTemplate,
}),
            });

            alert("Configuration enregistrée");
          }}
          style={{
            marginTop: 24,
            padding: "12px 20px",
            cursor: "pointer",
          }}
        >
          Enregistrer la configuration
        </button>

        <button
          onClick={async () => {
            const response = await fetch("/api/config/test", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                boardId,
              }),
            });

            const data = await response.json();

            alert(data.message || "Test envoyé");
          }}
          style={{
            marginLeft: 12,
            padding: "12px 20px",
            cursor: "pointer",
          }}
        >
          Envoyer un test
        </button>

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
              .replaceAll("{item.url}", "https://monday.com")
              .replaceAll("{update.body}", "Exemple de commentaire"),
          }}
        />
      </section>
    </main>
  );
}