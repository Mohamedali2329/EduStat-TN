"use client";

import { useEffect, useMemo, useState } from "react";
import { api, FiliereItem, PredictionResult, RecommendationResponse } from "@/lib/api";

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
  const [filiereSearch, setFiliereSearch] = useState("");
  const [filieres, setFilieres] = useState<FiliereItem[]>([]);
  const [loadingFilieres, setLoadingFilieres] = useState(false);
  const [filiereCode, setFiliereCode] = useState("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [recommendationLimit, setRecommendationLimit] = useState(10);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = filiereSearch.trim();
    if (q.length < 2) {
      setFilieres([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingFilieres(true);
      try {
        const params = new URLSearchParams({ search: q }).toString();
        const data = await api.getFilieres(params);
        setFilieres(data.results || []);
      } catch {
        setFilieres([]);
      } finally {
        setLoadingFilieres(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [filiereSearch]);

  const selectedFiliere = useMemo(
    () => filieres.find((f) => f.code === filiereCode) || null,
    [filieres, filiereCode]
  );

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

  const handleRecommend = async () => {
    setRecommendationError("");
    setRecommendations(null);

    const parsedScore = parseFloat(score);
    if (Number.isNaN(parsedScore)) {
      setRecommendationError("Veuillez saisir un score valide.");
      return;
    }

    setLoadingRecommendations(true);
    try {
      const data = await api.recommend(parsedScore, section, recommendationLimit);
      setRecommendations(data);
    } catch (err: unknown) {
      setRecommendationError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingRecommendations(false);
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
            Score (barème réel)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="200"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Ex: 130"
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

        {/* Filière Search */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher une filière
          </label>
          <input
            type="text"
            value={filiereSearch}
            onChange={(e) => setFiliereSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="Ex: Licence en Arabe, médecine, informatique..."
          />
          <p className="mt-1 text-xs text-slate-500">
            Tapez au moins 2 lettres pour voir les filières.
          </p>
        </div>

        {/* Filière Select */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Choisir la filière
          </label>
          <select
            required
            value={filiereCode}
            onChange={(e) => setFiliereCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">
              {loadingFilieres
                ? "Chargement des filières..."
                : filieres.length
                  ? "Sélectionnez une filière"
                  : "Aucune filière. Lancez une recherche."}
            </option>
            {filieres.map((f) => (
              <option key={f.id} value={f.code}>
                [{f.code}] {f.nom}{f.universite_nom ? ` - ${f.universite_nom}` : ""}
              </option>
            ))}
          </select>
          {selectedFiliere && (
            <p className="mt-1 text-xs text-slate-500">
              Code sélectionné: {selectedFiliere.code}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Calcul en cours…" : "Prédire mes chances"}
        </button>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de filières recommandées
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={recommendationLimit}
              onChange={(e) => setRecommendationLimit(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <button
            type="button"
            onClick={handleRecommend}
            disabled={loadingRecommendations}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loadingRecommendations ? "Recherche..." : "Voir les filières possibles"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {recommendationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {recommendationError}
        </div>
      )}

      {recommendations && (
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Filières possibles</h2>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
              {recommendations.total} recommandation(s)
            </span>
          </div>

          {recommendations.results.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Aucune filière trouvée pour ce score et cette section.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.results.map((item, idx) => {
                const min = item.score_min;
                const max = item.score_max;
                const userScore = recommendations.score;
                const width = max > min
                  ? Math.min(100, Math.max(0, ((userScore - min) / (max - min)) * 100))
                  : 100;

                return (
                  <div key={`${item.filiere_code}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {idx + 1}. {item.filiere_nom}
                        </p>
                        <p className="text-sm text-slate-500">
                          {item.universite_nom} • {item.gouvernorat}
                        </p>
                        <p className="text-xs text-slate-500">
                          Code: {item.filiere_code} • Niveau: {item.niveau}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {(item.probabilite_estimee * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg border border-red-100 bg-red-50 p-2">
                        <p className="text-xs text-red-700">Min</p>
                        <p className="font-semibold text-red-800">{item.score_min.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-amber-100 bg-amber-50 p-2">
                        <p className="text-xs text-amber-700">Moyen</p>
                        <p className="font-semibold text-amber-800">{item.score_moyen.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                        <p className="text-xs text-emerald-700">Max</p>
                        <p className="font-semibold text-emerald-800">{item.score_max.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Plage</span>
                        <span>{item.score_min.toFixed(1)} - {item.score_max.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-primary-600" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Votre score: {recommendations.score.toFixed(1)} • Dernier seuil: {item.dernier_seuil.toFixed(1)} • Marge: {item.marge >= 0 ? "+" : ""}{item.marge.toFixed(1)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
