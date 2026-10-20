const form = document.getElementById("recipe-form");
const button = document.getElementById("generate-btn");
const results = document.getElementById("results");
const output = document.getElementById("recipe-output");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const ingredients =
        document.getElementById("ingredients").value.trim();

    if (!ingredients) {
        alert("Please enter your available ingredients.");
        return;
    }

    button.disabled = true;
    button.textContent = "✨ Creating your recipe...";
    results.hidden = false;
    output.textContent = "Your AI chef is preparing some ideas...";

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ingredients,
                diet: document.getElementById("diet").value,
                max_time: document.getElementById("max-time").value,
                difficulty:
                    document.getElementById("difficulty").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        output.textContent = formatRecipe(data);
    } catch (error) {
        output.textContent = error.message ||
            "Could not connect to the recipe generator.";
    } finally {
        button.disabled = false;
        button.textContent = "✨ Generate My Recipes";
    }
});

function formatRecipe(recipe) {
    const ingredients = (recipe.ingredients || [])
        .map((item) => `- ${item}`)
        .join("\n");
    const instructions = (recipe.instructions || [])
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n");

    return [
        recipe.title || "Your recipe",
        "",
        "Ingredients:",
        ingredients,
        "",
        "Instructions:",
        instructions,
        "",
        `Prep time: ${recipe.prep_time || "Not specified"}`,
        `Cook time: ${recipe.cook_time || "Not specified"}`,
        `Servings: ${recipe.servings || "Not specified"}`,
        recipe.note || ""
    ].join("\n");
}
