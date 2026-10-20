import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai
from google.genai import errors

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("GEMINI_API_KEY")
client = (
    genai.Client(
        api_key=api_key,
        http_options=genai.types.HttpOptions(timeout=60000),
    )
    if api_key
    else None
)
MODEL = "gemini-flash-lite-latest"


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/chat")
def chat():
    if client is None:
        return jsonify({"error": "Gemini API key is missing. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    raw_messages = data.get("messages", [])
    if not isinstance(raw_messages, list) or not raw_messages:
        return jsonify({"error": "Please send a conversation message."}), 400

    history = []
    for message in raw_messages[-30:]:
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        content = str(message.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            history.append(f"{role.title()}: {content}")

    if not history or not history[-1].startswith("User:"):
        return jsonify({"error": "The latest conversation message must come from the user."}), 400

    prompt = """You are a friendly, conversational AI cooking assistant.
GOAL:
Have a natural conversation with the user, understand their available ingredients,
preferences, and cooking requirements, then recommend and finalize a suitable recipe.
RULES:
1. Remember details from the entire conversation.
2. Ask one short, useful follow-up question when important information is missing.
3. Ask about dietary preference, spice level, or cooking time when relevant.
4. Identify ingredients the user already has and items still required. Never claim
   the user has an item without evidence.
5. Suggest reasonable substitutions where possible.
6. Respect dietary restrictions and cooking-time preferences.
7. Do not finalize a recipe until enough information is known or the user asks.
8. When asked to finalize, provide the recipe name, available ingredients,
   additional required items, quantities, preparation steps, cooking time, and servings.
9. Clearly distinguish optional items from essential items.
10. Keep replies concise and natural because they will be spoken aloud.
11. Never claim you can physically inspect the user's kitchen.

CONVERSATION SO FAR:
""" + "\n".join(history)

    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        reply = response.text
        if not reply:
            return jsonify({"error": "The AI returned no response."}), 502
        return jsonify({"reply": reply})
    except errors.APIError as error:
        app.logger.exception("Conversation generation failed")
        if error.code == 429:
            message = "Gemini API quota has been exceeded. Please try again later."
        elif error.code in {503, 504}:
            message = "Gemini is temporarily busy. Please try again in a moment."
        else:
            message = "Gemini could not respond. Please check your API configuration."
        return jsonify({"error": message}), 502


@app.post("/generate")
def generate_recipe():
    if client is None:
        return jsonify({"error": "Gemini API key is missing. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    ingredients = str(data.get("ingredients", "")).strip()
    diet = str(data.get("diet", "Any")).strip()
    difficulty = str(data.get("difficulty", "Easy")).strip()

    if not ingredients:
        return jsonify({"error": "Please enter at least one ingredient."}), 400
    if len(ingredients) > 1000:
        return jsonify({"error": "Please enter a shorter ingredient list."}), 400

    if diet not in {"Any", "Vegetarian", "Non-vegetarian", "Vegan"}:
        diet = "Any"
    if difficulty not in {"Easy", "Medium", "Hard"}:
        difficulty = "Easy"

    try:
        max_time = int(data.get("max_time", 30))
    except (ValueError, TypeError):
        max_time = 30
    if max_time not in {15, 30, 45, 60}:
        max_time = 30

    prompt = f"""
ROLE:
You are a practical professional chef who creates reliable home-cooking recipes.

CONSTRAINTS:
- Use the available ingredients: {ingredients}
- Dietary preference: {diet}
- Maximum cooking time: {max_time} minutes
- Difficulty: {difficulty}
- Do not invent unavailable specialty ingredients.

OUTPUT:
Return valid JSON only, with exactly these keys:
{{
  "title": "string",
  "ingredients": ["string"],
  "instructions": ["string"],
  "prep_time": "string",
  "cook_time": "string",
  "servings": "string",
  "note": "string"
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        recipe = json.loads(response.text)
    except errors.APIError:
        app.logger.exception("Gemini API request failed")
        return jsonify({"error": "Gemini could not generate a recipe right now."}), 502
    except (json.JSONDecodeError, TypeError):
        app.logger.exception("Gemini returned an invalid recipe response")
        return jsonify({"error": "Gemini returned an invalid recipe response."}), 502

    if not isinstance(recipe, dict):
        return jsonify({"error": "Gemini returned an invalid recipe response."}), 502
    return jsonify(recipe)


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "true").lower() == "true")
