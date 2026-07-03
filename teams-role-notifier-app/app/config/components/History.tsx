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
  success: boolean;
  error?: string;
  durationMs: number;
};

export default function History() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [history, setHistory] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;

      if (data?.boardId) {
        setBoardId(data.boardId);
      }
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
        <button
          onClick={() => loadHistory(boardId)}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          Rafraîchir
        </button>
      )}

      {loading && <p>Chargement...</p>}

      {!loading && history.length === 0 && (
        <p>Aucune exécution enregistrée.</p>
      )}

      {!loading && history.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            maxWidth: 1000,
          }}
        >
          <thead>
            <tr>
              <th style={th}>Statut</th>
              <th style={th}>Date</th>
              <th style={th}>Événement</th>
              <th style={th}>Expéditeur</th>
              <th style={th}>Destinataires</th>
              <th style={th}>Durée</th>
              <th style={th}>Erreur</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td style={td}>
                  {item.success ? "🟢 Succès" : "🔴 Échec"}
                </td>

                <td style={td}>
                  {new Date(item.date).toLocaleString("fr-FR")}
                </td>

                <td style={td}>{item.event}</td>

                <td style={td}>
                  {item.sender.email || "-"}
                  {item.sender.fallbackUsed && (
                    <div style={{ fontSize: 12, color: "#777" }}>
                      fallback utilisé
                    </div>
                  )}
                </td>

                <td style={td}>
  {item.recipientsDetails?.map((user: any) => (
    <div key={user.id}>
      {user.name}
    </div>
  ))}
</td>

                <td style={td}>
                  {(item.durationMs / 1000).toFixed(2)} s
                </td>

                <td style={td}>{item.error || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

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