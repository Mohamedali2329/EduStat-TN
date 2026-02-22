interface Props {
  totaux: {
    gouvernorats: number;
    universites: number;
    filieres: number;
    scores: number;
  };
}

const cards = [
  { key: "gouvernorats" as const, label: "Gouvernorats", icon: "", color: "bg-blue-50 text-blue-700" },
  { key: "universites" as const, label: "Universités", icon: "", color: "bg-emerald-50 text-emerald-700" },
  { key: "filieres" as const, label: "Filières", icon: "", color: "bg-amber-50 text-amber-700" },
  { key: "scores" as const, label: "Scores enregistrés", icon: "", color: "bg-purple-50 text-purple-700" },
];

export default function StatsCards({ totaux }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`rounded-xl border p-5 shadow-sm ${c.color}`}
        >
          <div className="text-2xl">{c.icon}</div>
          <div className="mt-2 text-2xl font-bold">{totaux[c.key].toLocaleString("fr-TN")}</div>
          <div className="text-sm opacity-80">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
