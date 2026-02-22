"""
Management command to train the XGBoost prediction model.

Usage:
    python manage.py train_model
"""
from django.core.management.base import BaseCommand
from orientation.services.prediction import train_model


class Command(BaseCommand):
    help = "Entraîner le modèle XGBoost sur les scores historiques"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Entrainement du modele XGBoost..."))
        metrics = train_model()

        if "error" in metrics:
            self.stderr.write(self.style.ERROR(metrics['error']))
            return

        self.stdout.write(self.style.SUCCESS("Modele entraine avec succes !"))
        for k, v in metrics.items():
            self.stdout.write(f"   {k}: {v}")
