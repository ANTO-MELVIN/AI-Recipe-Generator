import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai
from google.genai import errors

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None
MODEL = "gemini-3.8-flash"


@app.get("/")
def home():
    return render_template("index.html")


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
