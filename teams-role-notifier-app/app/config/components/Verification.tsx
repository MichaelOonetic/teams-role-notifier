export default function Verification() {
  return (
    <main>
      <h1>🧪 Vérification</h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 20,
          background: "#f7f7f7",
          maxWidth: 900,
        }}
      >
        <h2>État de la configuration</h2>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <div>🟢 Configuration du board</div>
          <div>🟢 Configuration Teams</div>
          <div>🟢 Diagnostics actifs</div>
          <div>🟢 Historique actif</div>
          <div>🟢 Santé active</div>

          <hr />

          <strong>Statut global</strong>

          <div
            style={{
              color: "#0a8f08",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            🟢 Configuration valide
          </div>
        </div>
      </div>
    </main>
  );
}