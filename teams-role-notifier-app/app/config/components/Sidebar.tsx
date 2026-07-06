"use client";

type Props = {
  selected: string;
  onSelect: (tab: string) => void;
};

const items = [
  {
    id: "configuration",
    label: "⚙ Configuration",
  },
  {
    id: "diagnostics",
    label: "📊 Diagnostics",
  },
  {
    id: "history",
    label: "📜 Historique",
  },
  {
    id: "health",
    label: "💚 Santé",
  },
  {
  id: "verification",
  label: "🧪 Vérification",
},
  {
    id: "about",
    label: "ℹ À propos",
  },
];

export default function Sidebar({
  selected,
  onSelect,
}: Props) {
  return (
    <div
      style={{
        width: 240,
        borderRight: "1px solid #ddd",
        padding: 16,
      }}
    >
      <h2>Teams Center</h2>

      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            marginBottom: 8,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            background:
              selected === item.id
                ? "#0073ea"
                : "transparent",
            color:
              selected === item.id
                ? "#fff"
                : "#333",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}