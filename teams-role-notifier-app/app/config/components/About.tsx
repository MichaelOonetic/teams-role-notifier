export default function About() {
  return (
    <main>
      <h1>ℹ À propos</h1>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 20,
          background: "#f7f7f7",
          maxWidth: 760,
        }}
      >
        <h2>Teams Role Notifier</h2>

        <p>
          Application Monday.com permettant d&apos;envoyer des notifications
          Microsoft Teams à partir des automatisations Monday.
        </p>

        <h3>Version</h3>
        <p>1.0.0</p>

        <h3>Fonctionnalités</h3>

        <ul>
          <li>Notifications Teams depuis Monday.com</li>
          <li>Configuration par tableau</li>
          <li>Destinataires via colonnes People</li>
          <li>CC multiples</li>
          <li>Auteur réel de l&apos;action</li>
          <li>Fallback automatique</li>
          <li>Diagnostics</li>
          <li>Historique</li>
          <li>État de santé du board</li>
        </ul>

        <h3>Documentation</h3>

        <p>
          Consultez les fichiers README, ARCHITECTURE, CHANGELOG et ROADMAP à
          la racine du projet.
        </p>
      </section>
    </main>
  );
}