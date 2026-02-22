"""
Service Chatbot — Intégration OpenRouter (Mistral / Llama)
============================================================
Appelle l'API OpenRouter avec un System Prompt qui force l'IA
à répondre en tant qu'expert en orientation universitaire tunisienne,
en français et en derja tunisien.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es "EduBot", un expert en orientation universitaire tunisienne.

RÈGLES STRICTES :
1. Tu réponds UNIQUEMENT aux questions liées à l'orientation universitaire en Tunisie :
   filières, scores d'admission, universités, sections du bac, débouchés professionnels.
2. Tu parles en français clair et simple. Si l'utilisateur écrit en derja tunisienne (تونسي),
   tu réponds aussi en derja tunisienne avec des caractères latins ou arabes selon sa préférence.
3. Tu utilises les données réelles du système d'orientation tunisien (scores, filières, etc.).
4. Si on te pose une question hors-sujet (politique, religion, sport…), tu réponds poliment :
   "Désolé, je suis spécialisé uniquement dans l'orientation universitaire tunisienne."
5. Tu donnes des conseils pratiques et encourageants aux bacheliers.
6. Tu connais les sections du bac tunisien : Maths, Sciences Exp., Technique, Économie, Lettres, Info, Sport.
7. Quand tu mentionnes des scores, précise qu'ils sont sur 4 et varient chaque année.

EXEMPLES DE RÉPONSES EN DERJA :
- "Score mta3 médecine fl 2024 kèn 3.2 lel section sciences. Amma kol 3am yetbaddel."
- "Ki t7eb informatique, sections maths walla info 3andhom a7san chances."

Sois concis, utile et bienveillant."""

# Default model — can be overridden in settings
DEFAULT_MODEL = getattr(settings, "OPENROUTER_MODEL", "mistralai/mistral-7b-instruct")


def chat_with_bot(user_message: str, conversation_history: list | None = None) -> dict:
    """
    Envoie un message au chatbot via l'API OpenRouter.

    Args:
        user_message: Le message de l'utilisateur.
        conversation_history: Historique optionnel [{role, content}, …]

    Returns:
        dict avec 'response', 'model', 'usage' ou 'error'.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        return {
            "error": "Clé API OpenRouter non configurée. "
                     "Ajoutez OPENROUTER_API_KEY dans le fichier .env"
        }

    # Build messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history:
        # Keep last 10 exchanges max to manage token usage
        messages.extend(conversation_history[-20:])

    messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edustat-tn.vercel.app",
        "X-Title": "EduStat-TN Chatbot",
    }

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": 800,
        "temperature": 0.7,
        "top_p": 0.9,
    }

    try:
        response = requests.post(
            settings.OPENROUTER_BASE_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        assistant_message = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return {
            "response": assistant_message,
            "model": data.get("model", DEFAULT_MODEL),
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
            },
        }

    except requests.exceptions.Timeout:
        logger.error("OpenRouter API timeout")
        return {"error": "Le service IA est temporairement indisponible (timeout)."}
    except requests.exceptions.HTTPError as exc:
        logger.error("OpenRouter HTTP error: %s — %s", exc.response.status_code, exc.response.text)
        return {"error": f"Erreur API ({exc.response.status_code}). Réessayez plus tard."}
    except (requests.exceptions.RequestException, KeyError) as exc:
        logger.error("OpenRouter request failed: %s", exc)
        return {"error": "Impossible de contacter le service IA."}
