"use client";

import { useEffect, useState } from "react";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export default function DiagnosticsPage() {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [diagnostic, setDiagnostic] = useState<any>(null);

  useEffect(() => {
    monday.listen("context", (res) => {
      const data = res.data as any;

      if (data?.boardId) {
        setBoardId(data.boardId);
      }
    });
  }, []);

  useEffect(() => {
    if (!boardId) return;

    fetch(
      `/api/diagnostics?boardId=${boardId}`
    )
      .then((res) => res.json())
      .then((data) => {
        setDiagnostic(data.lastExecution);
      });
  }, [boardId]);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <h1>Teams Diagnostics</h1>

      <p>
        <strong>Board :</strong>{" "}
        {boardId}
      </p>

      {!diagnostic && (
        <p>
          Aucune exécution enregistrée.
        </p>
      )}

      {diagnostic && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 20,
            background: "#fafafa",
            maxWidth: 700,
          }}
        >
          <h2>
            Dernière exécution
          </h2>

          <table
            style={{
              width: "100%",
              marginTop: 16,
            }}
          >
            <tbody>
              <tr>
                <td><strong>Événement</strong></td>
                <td>{diagnostic.event}</td>
              </tr>

              <tr>
                <td><strong>Date</strong></td>
                <td>{diagnostic.date}</td>
              </tr>

              <tr>
                <td><strong>Succès</strong></td>
                <td>
                  {diagnostic.success
                    ? "🟢 Oui"
                    : "🔴 Non"}
                </td>
              </tr>

              <tr>
                <td><strong>Mode expéditeur</strong></td>
                <td>
                  {diagnostic.sender.mode}
                </td>
              </tr>

              <tr>
                <td><strong>Fallback</strong></td>
                <td>
                  {diagnostic.sender
                    .fallbackUsed
                    ? "Oui"
                    : "Non"}
                </td>
              </tr>

              <tr>
                <td><strong>Durée</strong></td>
                <td>
                  {(
                    diagnostic.durationMs /
                    1000
                  ).toFixed(2)}
                  {" "}s
                </td>
              </tr>

              <tr>
                <td><strong>Destinataires</strong></td>
                <td>
                  {diagnostic.recipients.length}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}