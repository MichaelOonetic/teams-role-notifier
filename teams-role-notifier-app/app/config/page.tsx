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

<br><br>

<a href="{item.url}">Ouvrir l'item</a>`,

  updateCreated: `<b>Nouveau commentaire</b>

<br><br>

<b>Ticket :</b> {item.name}

<br><br>

{update.body}

<br><br>

<a href="{item.url}">Ouvrir l'item</a>`,

  itemCreated: `<b>Nouvel élément créé</b>

<br><br>

<b>Ticket :</b> {item.name}

<br><br>

<a href="{item.url}">Ouvrir l'item</a>`,

  personAssigned: `<b>Nouvelle affectation</b>

<br><br>

<b>Ticket :</b> {item.name}

<br><br>

<a href="{item.url}">Ouvrir l'item</a>`,
};

export default function ConfigPage() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);

  const [senderColumn, setSenderColumn] = useState("");
  const [recipientColumn, setRecipientColumn] = useState("");
  const [ccColumns, setCcColumns] = useState<string[]>([]);
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
        if (config.senderColumn) {
          setSenderColumn(config.senderColumn);
        }

        if (config.recipientColumn) {
          setRecipientColumn(config.recipientColumn);
        }

        if (config.ccColumns) {
          setCcColumns(config.ccColumns);
        }

        if (config.template) {
          setMessage(config.template);
        }
        if (config.selectedTemplate) {
  setSelectedTemplate(config.selectedTemplate);
}
      });
  }, [boardId]);

  const peopleColumns = columns.filter(
    (column) => column.type === "people"
  );

  function toggleCcColumn(columnId: string) {
    setCcColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    );
  }

  function applyTemplate(value: string) {
    setSelectedTemplate(value);

    if (value === "statusChanged") {
      setMessage(templates.statusChanged);
    }

    if (value === "updateCreated") {
      setMessage(templates.updateCreated);
    }

    if (value === "itemCreated") {
      setMessage(templates.itemCreated);
    }

    if (value === "personAssigned") {
      setMessage(templates.personAssigned);
    }
  }

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
          <option value="statusChanged">Changement de statut</option>
          <option value="updateCreated">Nouveau commentaire</option>
          <option value="itemCreated">Nouvel élément créé</option>
          <option value="personAssigned">Nouvelle affectation</option>
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
        <button
          onClick={async () => {
            await fetch("/api/config/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                boardId,
                senderColumn,
                recipientColumn,
                ccColumns,
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