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

type MicrosoftConnection = {
  email: string;
  name: string;
  status: "healthy" | "expired" | "missing" | "error";
  message: string;
};

export default function Health() {
  const [boardId, setBoardId] =
    useState<number | null>(null);

  const [lastExecution, setLastExecution] =
    useState<Diagnostic | null>(null);

  const [history, setHistory] =
    useState<Diagnostic[]>([]);

  const [
    microsoftConnections,
    setMicrosoftConnections,
  ] = useState<MicrosoftConnection[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;

      if (data?.boardId) {
        setBoardId(data.boardId);
      }
    });
  }, []);

  async function loadHealth(id: number) {
    setLoading(true);

    try {
      const [
        diagnosticsResponse,
        microsoftResponse,
      ] = await Promise.all([
        fetch(`/api/diagnostics?boardId=${id}`),
        fetch("/api/health/microsoft"),
      ]);

      const diagnosticsData =
        await diagnosticsResponse.json();

      const microsoftData =
        await microsoftResponse.json();

      setLastExecution(
        diagnosticsData.lastExecution || null
      );

      setHistory(
        diagnosticsData.history || []
      );

      setMicrosoftConnections(
        microsoftData.connections || []
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!boardId) return;

    loadHealth(boardId);
  }, [boardId]);

  const failures =
    history.filter((item) => !item.success);

  const lastSuccess =
    lastExecution?.success;

  return (
    <main>
      <h1>💚 Santé</h1>

      <p>
        <strong>Board ID :</strong>{" "}
        {boardId || "chargement..."}
      </p>

      {boardId && (
        <button
          onClick={() => loadHealth(boardId)}
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

      {!loading && (
        <>
          <section
            style={{
              display: "grid",
              gap: 16,
              maxWidth: 800,
            }}
          >
            <HealthCard
              title="Dernière exécution"
              status={
                !lastExecution
                  ? "warning"
                  : lastSuccess
                    ? "success"
                    : "error"
              }
              text={
                !lastExecution
                  ? "Aucune exécution enregistrée"
                  : lastSuccess
                    ? "Dernière notification envoyée avec succès"
                    : "La dernière notification a échoué"
              }
            />

            <HealthCard
              title="Historique"
              status={
                history.length > 0
                  ? "success"
                  : "warning"
              }
              text={`${history.length} exécution(s) enregistrée(s)`}
            />

            <HealthCard
              title="Erreurs"
              status={
                failures.length === 0
                  ? "success"
                  : "error"
              }
              text={
                failures.length === 0
                  ? "Aucune erreur récente"
                  : `${failures.length} erreur(s) récente(s)`
              }
            />

            <HealthCard
              title="Performance"
              status={
                !lastExecution
                  ? "warning"
                  : lastExecution.durationMs < 8000
                    ? "success"
                    : "warning"
              }
              text={
                !lastExecution
                  ? "Aucune mesure disponible"
                  : `Dernière exécution : ${(
                      lastExecution.durationMs / 1000
                    ).toFixed(2)} s`
              }
            />
          </section>

          <section
            style={{
              marginTop: 32,
              maxWidth: 800,
            }}
          >
            <h2>
              🔐 Connexions Microsoft
            </h2>

            <p
              style={{
                color: "#666",
              }}
            >
              État des comptes Microsoft enregistrés
              dans Teams Role Notifier.
            </p>

            {microsoftConnections.length === 0 ? (
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  background: "#f7f7f7",
                }}
              >
                🟡 Aucun compte Microsoft enregistré
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {microsoftConnections.map(
                  (connection) => (
                    <MicrosoftConnectionCard
                      key={connection.email}
                      connection={connection}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function MicrosoftConnectionCard({
  connection,
}: {
  connection: MicrosoftConnection;
}) {
  const icon =
    connection.status === "healthy"
      ? "🟢"
      : connection.status === "expired"
        ? "🔴"
        : connection.status === "missing"
          ? "🟠"
          : "🔴";

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        background: "#f7f7f7",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {icon} {connection.name}
      </div>

      <div
        style={{
          marginTop: 6,
        }}
      >
        {connection.message}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: "#666",
        }}
      >
        {connection.email}
      </div>
    </div>
  );
}

function HealthCard({
  title,
  status,
  text,
}: {
  title: string;
  status: "success" | "warning" | "error";
  text: string;
}) {
  const icon =
    status === "success"
      ? "🟢"
      : status === "warning"
        ? "🟡"
        : "🔴";

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        background: "#f7f7f7",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {icon} {title}
      </h2>

      <p style={{ marginBottom: 0 }}>
        {text}
      </p>
    </div>
  );
}