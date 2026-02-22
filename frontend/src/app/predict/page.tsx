"use client";

import { useState } from "react";
import { api, PredictionResult } from "@/lib/api";

const SECTIONS = [
  { value: "M", label: "Mathématiques" },
  { value: "S", label: "Sciences Expérimentales" },
  { value: "T", label: "Technique" },
  { value: "E", label: "Économie et Gestion" },
  { value: "L", label: "Lettres" },
  { value: "I", label: "Informatique" },
  { value: "SP", label: "Sport" },
];

export default function PredictPage() {
  const [score, setScore] = useState("");
  const [section, setSection] = useState("M");
  const [filiereCode, setFiliereCode] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await api.predict(parseFloat(score), section, filiereCode);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const probaColor = (p: number) => {
    if (p >= 0.8) return "text-emerald-600";
    if (p >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Prediction d&apos;admission</h1>
        <p className="mt-1 text-slate-500">
          Entrez votre score et la filière souhaitée pour estimer vos chances.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Score */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Score (sur 4)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="4"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Ex: 2.85"
          />
        </div>

        {/* Section Bac */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Section Bac
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filière Code */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Code filière
          </label>
          <input
            type="text"
            required
            value={filiereCode}
            onChange={(e) => setFiliereCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Ex: 601"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Calcul en cours…" : "Prédire mes chances"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-700">Résultat</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Filière</span>
              <span className="font-medium">
                [{result.filiere_code}] {result.filiere_nom}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Probabilité d&apos;admission</span>
              <span className={`text-2xl font-bold ${probaColor(result.probabilite_admission)}`}>
                {(result.probabilite_admission * 100).toFixed(1)}%
              </span>
            </div>
            {result.score_dernier_admis_precedent !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Score dernier admis (année précédente)</span>
                <span className="font-medium">
                  {result.score_dernier_admis_precedent.toFixed(2)}
                </span>
              </div>
            )}
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              💡 {result.conseil}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
