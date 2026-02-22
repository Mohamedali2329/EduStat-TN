"""Serializers for the orientation API."""
from rest_framework import serializers
from .models import Gouvernorat, Universite, Filiere, ScoreHistorique


class GouvernoratSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gouvernorat
        fields = "__all__"


class UniversiteSerializer(serializers.ModelSerializer):
    gouvernorat_nom = serializers.CharField(source="gouvernorat.nom", read_only=True)

    class Meta:
        model = Universite
        fields = ["id", "nom", "gouvernorat", "gouvernorat_nom", "adresse", "site_web"]


class FiliereSerializer(serializers.ModelSerializer):
    universite_nom = serializers.CharField(source="universite.nom", read_only=True)
    gouvernorat = serializers.CharField(
        source="universite.gouvernorat.nom", read_only=True
    )

    class Meta:
        model = Filiere
        fields = [
            "id", "code", "nom", "universite", "universite_nom",
            "gouvernorat", "type_diplome", "duree_annees", "sections_admises",
        ]


class ScoreHistoriqueSerializer(serializers.ModelSerializer):
    filiere_code = serializers.CharField(source="filiere.code", read_only=True)
    filiere_nom = serializers.CharField(source="filiere.nom", read_only=True)

    class Meta:
        model = ScoreHistorique
        fields = [
            "id", "filiere", "filiere_code", "filiere_nom",
            "annee", "section_bac", "score_dernier_admis",
            "score_premier_admis", "nombre_places",
        ]


class PredictionInputSerializer(serializers.Serializer):
    """Input for the admission prediction endpoint."""
    score = serializers.FloatField(
        min_value=0, max_value=4,
        help_text="Score du bachelier (sur 4)",
    )
    section_bac = serializers.CharField(
        max_length=3,
        help_text="Code section bac (M, S, T, E, L, I, SP)",
    )
    filiere_code = serializers.CharField(
        max_length=20,
        help_text="Code de la filière visée",
    )


class PredictionOutputSerializer(serializers.Serializer):
    """Output of the admission prediction."""
    filiere_code = serializers.CharField()
    filiere_nom = serializers.CharField()
    probabilite_admission = serializers.FloatField()
    score_dernier_admis_precedent = serializers.FloatField(allow_null=True)
    conseil = serializers.CharField()


class ChatMessageSerializer(serializers.Serializer):
    """Input for the chatbot endpoint."""
    message = serializers.CharField(max_length=2000)
    conversation_id = serializers.CharField(required=False, default="")
