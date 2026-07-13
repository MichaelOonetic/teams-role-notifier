"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

type Diagnostic = {
  id: string;
  date: string;
  boardId: string;
  event: string;
  sender: {
    mode: string;
    email: string;
    fallbackUsed: boolean;
  };
  recipients: string[];
  recipientsDetails?: {
    id: string;
    name: string;
    email: string;
  }[];
  success: boolean;
  error?: string;
  durationMs: number;
  message?: string;
  boardName?: string;
  itemName?: string;
  itemUrl?: string;

debug?: {
  teamsChats?: string[];
  senderEmail?: string | null;
  senderResult?: string;
  fallbackUsed?: boolean;
};
};

export default function History() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [history, setHistory] = useState<Diagnostic[]>([]);
  const [selected, setSelected] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;
      if (data?.boardId) setBoardId(data.boardId);
    });
  }, []);

  async function loadHistory(id: number) {
    setLoading(true);
    const response = await fetch(`/api/diagnostics?boardId=${id}`);
    const data = await response.json();
    setHistory(data.history || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!boardId) return;
    loadHistory(boardId);
  }, [boardId]);

  return (
    <main>
      <h1>📜 Historique</h1>

      <p>
        <strong>Board ID :</strong> {boardId || "chargement..."}
      </p>

      {boardId && (
        <button onClick={() => loadHistory(boardId)} style={button}>
          Rafraîchir
        </button>
      )}

      {loading && <p>Chargement...</p>}

      {!loading && history.length === 0 && (
        <p>Aucune exécution enregistrée.</p>
      )}

      {!loading && history.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Statut</th>
              <th style={th}>Date</th>
              <th style={th}>Événement</th>
              <th style={th}>Expéditeur</th>
              <th style={th}>Destinataires</th>
              <th style={th}>Durée</th>
              <th style={th}>Détail</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td style={td}>{item.success ? "🟢 Succès" : "🔴 Échec"}</td>
                <td style={td}>{new Date(item.date).toLocaleString("fr-FR")}</td>
                <td style={td}>{item.event}</td>
                <td style={td}>
                  {item.sender.email === "configured-column"
                    ? "Colonne configurée"
                    : item.sender.email || "-"}
                  {item.sender.fallbackUsed && (
                    <div style={{ fontSize: 12, color: "#777" }}>
                      fallback utilisé
                    </div>
                  )}
                </td>
                <td style={td}>
                  {item.recipientsDetails?.map((user) => (
                    <div key={user.id}>{user.name}</div>
                  ))}
                </td>
                <td style={td}>{(item.durationMs / 1000).toFixed(2)} s</td>
                <td style={td}>
                  <button onClick={() => setSelected(item)} style={button}>
                    👁 Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section style={panel}>
          <button onClick={() => setSelected(null)} style={closeButton}>
            Fermer
          </button>

          <h2>{selected.success ? "🟢" : "🔴"} Détail de l’exécution</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <div><strong>Événement :</strong> {selected.event}</div>
            <div><strong>Date :</strong> {new Date(selected.date).toLocaleString("fr-FR")}</div>
            <div><strong>Board :</strong> {selected.boardName || "-"}</div>
            <div><strong>Élément :</strong> {selected.itemName || "-"}</div>

            {selected.itemUrl && (
              <div>
                <strong>Lien :</strong>{" "}
                <a href={selected.itemUrl} target="_blank">
                  Ouvrir l’élément Monday
                </a>
              </div>
            )}

            <div>
              <strong>Expéditeur :</strong>{" "}
              {selected.sender.email === "configured-column"
                ? "Colonne configurée"
                : selected.sender.email || "-"}
            </div>

            <div>
              <strong>Fallback :</strong>{" "}
              {selected.sender.fallbackUsed ? "Oui" : "Non"}
            </div>

            <div>
              <strong>Destinataires :</strong>
              <ul>
                {selected.recipientsDetails?.map((user) => (
                  <li key={user.id}>
                    {user.name}
                    {user.email ? ` (${user.email})` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div><strong>Durée :</strong> {(selected.durationMs / 1000).toFixed(2)} s</div>

            {selected.error && (
              <div><strong>Erreur :</strong> {selected.error}</div>
            )}

            {selected.debug && (
              <div>
                <strong>Debug</strong>

                <div>
                  <strong>Sender :</strong>{" "}
                  {selected.debug.senderEmail || "-"}
                </div>

                <div>
                  <strong>Sender Result :</strong>{" "}
                  {selected.debug.senderResult || "-"}
                </div>

                <div>
                  <strong>Fallback utilisé :</strong>{" "}
                  {selected.debug.fallbackUsed ? "Oui" : "Non"}
                </div>

                <div>
                  <strong>Teams Chats :</strong>{" "}
                  {selected.debug.teamsChats?.join(", ") || "-"}
                </div>
              </div>
            )}

            {selected.message && (
              <div>
                <strong>Message envoyé</strong>
                <div
                  style={{
                    marginTop: 8,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                    background: "#fafafa",
                  }}
                  dangerouslySetInnerHTML={{ __html: selected.message }}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

const button = {
  padding: "10px 16px",
  cursor: "pointer",
};

const closeButton = {
  ...button,
  float: "right" as const,
};

const panel = {
  marginTop: 32,
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 20,
  background: "#f7f7f7",
  maxWidth: 900,
};

const th = {
  textAlign: "left" as const,
  borderBottom: "1px solid #ddd",
  padding: 10,
  background: "#f7f7f7",
};

const td = {
  borderBottom: "1px solid #eee",
  padding: 10,
  verticalAlign: "top" as const,
};