"""
API Views — EduStat-TN
========================
Endpoints :
  GET  /api/gouvernorats/
  GET  /api/universites/
  GET  /api/filieres/
  GET  /api/scores/
  GET  /api/stats/dashboard/
  GET  /api/health/
  POST /api/predict/
  POST /api/chat/
"""
import time
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Avg, Min, Max, Count, Q

from .models import Gouvernorat, Universite, Filiere, ScoreHistorique
from .serializers import (
    GouvernoratSerializer,
    UniversiteSerializer,
    FiliereSerializer,
    ScoreHistoriqueSerializer,
    PredictionInputSerializer,
    PredictionOutputSerializer,
    ChatMessageSerializer,
)
from .services.prediction import predict_admission
from .services.chatbot import chat_with_bot


# ── ViewSets (CRUD automatique) ──────────────────────────────────────

class GouvernoratViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Gouvernorat.objects.all()
    serializer_class = GouvernoratSerializer


class UniversiteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Universite.objects.select_related("gouvernorat").all()
    serializer_class = UniversiteSerializer
    filterset_fields = ["gouvernorat"]

    def get_queryset(self):
        qs = super().get_queryset()
        gov = self.request.query_params.get("gouvernorat")
        if gov:
            qs = qs.filter(gouvernorat_id=gov)
        return qs


class FiliereViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Filiere.objects.select_related("universite", "universite__gouvernorat").all()
    serializer_class = FiliereSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        univ = self.request.query_params.get("universite")
        gov = self.request.query_params.get("gouvernorat")
        search = self.request.query_params.get("search")
        if univ:
            qs = qs.filter(universite_id=univ)
        if gov:
            qs = qs.filter(universite__gouvernorat_id=gov)
        if search:
            qs = qs.filter(Q(nom__icontains=search) | Q(code__icontains=search))
        return qs


class ScoreHistoriqueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScoreHistorique.objects.select_related("filiere").all()
    serializer_class = ScoreHistoriqueSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        filiere = self.request.query_params.get("filiere")
        annee = self.request.query_params.get("annee")
        section = self.request.query_params.get("section_bac")
        if filiere:
            qs = qs.filter(filiere_id=filiere)
        if annee:
            qs = qs.filter(annee=annee)
        if section:
            qs = qs.filter(section_bac=section)
        return qs


# ── Dashboard Statistics ──────────────────────────────────────────────

@api_view(["GET"])
def dashboard_stats(request):
    """
    Retourne les statistiques agrégées pour le Dashboard BI.
    """
    # Counts
    total_universites = Universite.objects.count()
    total_filieres = Filiere.objects.count()
    total_scores = ScoreHistorique.objects.count()
    total_gouvernorats = Gouvernorat.objects.count()

    # Score moyen par année
    scores_par_annee = (
        ScoreHistorique.objects
        .values("annee")
        .annotate(
            score_moyen=Avg("score_dernier_admis"),
            score_min=Min("score_dernier_admis"),
            score_max=Max("score_dernier_admis"),
            nb_filieres=Count("filiere", distinct=True),
        )
        .order_by("annee")
    )

    # Score moyen par gouvernorat
    scores_par_gouvernorat = (
        ScoreHistorique.objects
        .values("filiere__universite__gouvernorat__nom")
        .annotate(
            score_moyen=Avg("score_dernier_admis"),
            nb_filieres=Count("filiere", distinct=True),
        )
        .order_by("-score_moyen")
    )

    # Score moyen par section bac
    scores_par_section = (
        ScoreHistorique.objects
        .values("section_bac")
        .annotate(
            score_moyen=Avg("score_dernier_admis"),
            nb_scores=Count("id"),
        )
        .order_by("section_bac")
    )

    # Top 10 filières les plus sélectives (dernier score le plus élevé)
    latest_year = ScoreHistorique.objects.order_by("-annee").values_list("annee", flat=True).first()
    top_filieres = []
    if latest_year:
        top_filieres = list(
            ScoreHistorique.objects
            .filter(annee=latest_year)
            .select_related("filiere", "filiere__universite")
            .order_by("-score_dernier_admis")[:10]
            .values(
                "filiere__code", "filiere__nom",
                "filiere__universite__nom",
                "score_dernier_admis", "section_bac",
            )
        )

    # Évolution des scores pour une filière donnée (si filiere_id fourni)
    evolution = []
    filiere_id = request.query_params.get("filiere_id")
    if filiere_id:
        evolution = list(
            ScoreHistorique.objects
            .filter(filiere_id=filiere_id)
            .values("annee", "section_bac", "score_dernier_admis")
            .order_by("annee")
        )

    return Response({
        "totaux": {
            "gouvernorats": total_gouvernorats,
            "universites": total_universites,
            "filieres": total_filieres,
            "scores": total_scores,
        },
        "scores_par_annee": list(scores_par_annee),
        "scores_par_gouvernorat": list(scores_par_gouvernorat),
        "scores_par_section": list(scores_par_section),
        "top_filieres_selectives": top_filieres,
        "evolution_filiere": evolution,
    })


# ── Prediction Endpoint ──────────────────────────────────────────────

@api_view(["POST"])
def prediction_view(request):
    """
    POST /api/predict/
    Body: { "score": 2.85, "section_bac": "S", "filiere_code": "601" }
    """
    serializer = PredictionInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    result = predict_admission(
        score=serializer.validated_data["score"],
        section_bac=serializer.validated_data["section_bac"],
        filiere_code=serializer.validated_data["filiere_code"],
    )

    if "error" in result:
        return Response({"error": result["error"]}, status=status.HTTP_404_NOT_FOUND)

    return Response(PredictionOutputSerializer(result).data)


# ── Chatbot Endpoint ─────────────────────────────────────────────────

@api_view(["POST"])
def chatbot_view(request):
    """
    POST /api/chat/
    Body: { "message": "Chnahiya a7san filière lel section maths?" }
    """
    serializer = ChatMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Récupérer l'historique de la session (simplifié — pas de persistence)
    history = request.data.get("history", [])

    result = chat_with_bot(
        user_message=serializer.validated_data["message"],
        conversation_history=history if isinstance(history, list) else [],
    )

    if "error" in result:
        return Response({"error": result["error"]}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(result)


# ── Health Check ─────────────────────────────────────────────────────

@api_view(["GET"])
def health_check(request):
    """
    GET /api/health/
    Vérifie que le backend et la base de données fonctionnent.
    """
    from django.db import connection

    checks = {"status": "ok", "timestamp": time.time()}

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "connected"
    except Exception as exc:
        checks["database"] = f"error: {exc}"
        checks["status"] = "degraded"

    # Check if ML model exists
    import os
    from django.conf import settings
    model_path = str(settings.ML_MODEL_PATH)
    checks["ml_model"] = "loaded" if os.path.isfile(model_path) else "not_trained"

    status_code = 200 if checks["status"] == "ok" else 503
    return Response(checks, status=status_code)
