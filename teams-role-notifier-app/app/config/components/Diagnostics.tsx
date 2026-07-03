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
};

export default function Diagnostics() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [lastExecution, setLastExecution] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;

      if (data?.boardId) {
        setBoardId(data.boardId);
      }
    });
  }, []);

  async function loadDiagnostics(id: number) {
    setLoading(true);

    const response = await fetch(`/api/diagnostics?boardId=${id}`);
    const data = await response.json();

    setLastExecution(data.lastExecution || null);
    setLoading(false);
  }

  useEffect(() => {
    if (!boardId) return;
    loadDiagnostics(boardId);
  }, [boardId]);

  return (
    <main>
      <h1>📊 Diagnostics</h1>

      <p>
        <strong>Board ID :</strong> {boardId || "chargement..."}
      </p>

      {boardId && (
        <button
          onClick={() => loadDiagnostics(boardId)}
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

      {!loading && !lastExecution && (
        <p>Aucune exécution enregistrée pour ce tableau.</p>
      )}

      {!loading && lastExecution && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 20,
            background: "#f7f7f7",
            maxWidth: 760,
          }}
        >
          <h2>
            {lastExecution.success ? "🟢" : "🔴"} Dernière exécution
          </h2>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <div>
              <strong>Événement :</strong> {lastExecution.event}
            </div>

            <div>
              <strong>Date :</strong>{" "}
              {new Date(lastExecution.date).toLocaleString("fr-FR")}
            </div>

            <div>
              <strong>Résultat :</strong>{" "}
              {lastExecution.success ? "Succès" : "Échec"}
            </div>

            {lastExecution.error && (
              <div>
                <strong>Erreur :</strong> {lastExecution.error}
              </div>
            )}

            <div>
              <strong>Mode expéditeur :</strong>{" "}
              {lastExecution.sender.mode === "triggeredBy"
                ? "Auteur de l'action"
                : "Colonne configurée"}
            </div>

            <div>
              <strong>Email expéditeur :</strong>{" "}
              {lastExecution.sender.email || "-"}
            </div>

            <div>
              <strong>Fallback utilisé :</strong>{" "}
              {lastExecution.sender.fallbackUsed ? "Oui" : "Non"}
            </div>

            <div>
              <strong>Destinataires :</strong>{" "}
              {lastExecution.recipients.length}
            </div>

            <div>
  <strong>Destinataires :</strong>

  <ul style={{ marginTop: 8 }}>
    {lastExecution.recipientsDetails?.map((user: any) => (
      <li key={user.id}>
        {user.name}
        {user.email ? ` (${user.email})` : ""}
      </li>
    ))}
  </ul>
</div>
            <div>
              <strong>Durée :</strong>{" "}
              {(lastExecution.durationMs / 1000).toFixed(2)} s
            </div>
          </div>
        </section>
      )}
    </main>
  );
}