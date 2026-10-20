const form = document.getElementById("recipe-form");
const button = document.getElementById("generate-btn");
const results = document.getElementById("results");
const output = document.getElementById("recipe-output");
const recipeModal = document.getElementById("recipe-modal");
const pages = document.querySelectorAll(".wizard-page");
let selectedChoice = "eat";
let selectedCategory = "all";
let browseAllRecipes = false;

document.getElementById("browse-recipes-btn").addEventListener("click", () => {
    browseAllRecipes = true;
    selectedCategory = "all";
    document.querySelectorAll(".recipe-filter").forEach((item) =>
        item.classList.toggle("active", item.dataset.category === "all")
    );
    applyRecipeVisibility();
    goToPage(3);
});

function goToPage(pageNumber) {
    pages.forEach((page) => {
        page.hidden = page.id !== `page-${pageNumber}`;
    });
    if (pageNumber === 3) {
        document.getElementById("results").hidden = false;
        document.getElementById("results").classList.add("wizard-page");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-choice]").forEach((choice) => {
    choice.addEventListener("click", () => {
        selectedChoice = choice.dataset.choice;
        browseAllRecipes = false;
        document.getElementById("choice-summary").textContent =
            selectedChoice === "eat"
                ? "Choose ingredients for your meal or snack."
                : "Choose ingredients for your juice or milkshake.";
        document.getElementById("ingredient-heading").textContent =
            selectedChoice === "eat"
                ? "What do you have in your kitchen to eat?"
                : "What do you have in your kitchen to drink?";
        selectedCategory = "all";
        document.querySelectorAll(".recipe-filter").forEach((item) =>
            item.classList.toggle("active", item.dataset.category === "all")
        );
        applyRecipeVisibility();
        goToPage(2);
    });
});

document.querySelectorAll("[data-go-page]").forEach((button) => {
    button.addEventListener("click", () => goToPage(button.dataset.goPage));
});

const popularRecipes = {
    biryani: {
        title: "Chicken Biryani",
        meta: "Fragrant rice · 55 minutes · 4 servings",
        image: "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=80",
        ingredients: ["2 cups basmati rice", "500 g chicken", "1 onion, sliced", "2 tomatoes, chopped", "2 tbsp biryani masala", "Yogurt, ginger, garlic, oil, salt"],
        steps: ["Wash and soak the rice for 20 minutes, then parboil it until nearly tender.", "Marinate the chicken with yogurt, ginger, garlic, masala, and salt.", "Cook the onion until golden, add the chicken and tomatoes, and simmer until tender.", "Layer the rice over the chicken, cover, and cook on low heat for 15 minutes.", "Gently mix and serve hot with yogurt or salad."]
    },
    "fried-rice": {
        title: "Vegetable Fried Rice",
        meta: "Easy weeknight meal · 25 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
        ingredients: ["3 cups cooked rice", "1 carrot, diced", "1 bell pepper, diced", "2 eggs", "2 spring onions", "2 tbsp soy sauce, oil, garlic"],
        steps: ["Heat oil in a large pan and scramble the eggs; set them aside.", "Stir-fry garlic, carrot, bell pepper, and spring onions until crisp-tender.", "Add the cold cooked rice and toss over high heat.", "Stir in soy sauce and the scrambled eggs.", "Taste, season if needed, and serve immediately."]
    },
    pasta: {
        title: "Creamy Garlic Pasta",
        meta: "Comfort food · 20 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=900&q=80",
        ingredients: ["200 g pasta", "4 garlic cloves, sliced", "1 cup cream", "½ cup parmesan or grated cheese", "1 tbsp butter", "Parsley, salt, and pepper"],
        steps: ["Boil the pasta in salted water until al dente and reserve a cup of pasta water.", "Melt butter and gently cook the garlic until fragrant.", "Add cream and simmer for 2 minutes.", "Toss in the pasta and cheese, loosening with pasta water as needed.", "Season with pepper, garnish with parsley, and serve."]
    },
    curry: {
        title: "Chickpea Curry",
        meta: "Vegetarian · 30 minutes · 3 servings",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
        ingredients: ["2 cans chickpeas", "1 onion, chopped", "2 tomatoes, chopped", "2 garlic cloves", "1 tsp curry powder", "Oil, salt, and cilantro"],
        steps: ["Cook the onion in oil until soft, then add garlic and curry powder.", "Add the tomatoes and simmer until they break down.", "Stir in the chickpeas and half a cup of water.", "Cover and simmer for 15 minutes, seasoning to taste.", "Garnish with cilantro and serve with rice or bread."]
    },
    "mango-juice": {
        title: "Fresh Mango Juice", meta: "Refreshing drink · 10 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=900&q=80",
        ingredients: ["2 ripe mangoes", "1 cup cold water", "Ice cubes", "Honey or sugar, optional"],
        steps: ["Peel and cut the mangoes.", "Blend the mango pieces with cold water until smooth.", "Add honey or sugar if needed.", "Pour over ice and serve chilled."]
    },
    "berry-smoothie": {
        title: "Berry Juice Blend", meta: "Fruity and fresh · 5 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=900&q=80",
        ingredients: ["1 cup mixed berries", "1 apple", "½ cup cold water", "Ice cubes"],
        steps: ["Wash the berries and chop the apple.", "Blend all ingredients until smooth.", "Strain if desired and serve immediately."]
    },
    "banana-shake": {
        title: "Banana Milkshake", meta: "Creamy favorite · 8 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=900&q=80",
        ingredients: ["2 ripe bananas", "2 cups chilled milk", "1 tbsp honey", "Ice cream, optional"],
        steps: ["Add bananas, milk, honey, and ice cream to a blender.", "Blend until creamy and smooth.", "Pour into glasses and serve cold."]
    },
    "chocolate-shake": {
        title: "Chocolate Milkshake", meta: "Rich and cold · 8 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80",
        ingredients: ["2 cups chilled milk", "2 tbsp cocoa powder", "2 tbsp sugar", "2 scoops vanilla ice cream"],
        steps: ["Add all ingredients to a blender.", "Blend until frothy and smooth.", "Pour into glasses and serve immediately."]
    },
    samosa: {
        title: "Crispy Samosa", meta: "Spiced snack · 35 minutes · 4 servings",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
        ingredients: ["Pastry sheets", "2 potatoes, boiled", "½ cup peas", "Cumin, chili, salt, and oil"],
        steps: ["Mash the potatoes and mix with peas and spices.", "Fill pastry sheets and fold into triangles.", "Seal the edges with water.", "Bake or fry until golden and crisp."]
    },
    sandwich: {
        title: "Grilled Veg Sandwich", meta: "Quick snack · 15 minutes · 2 servings",
        image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80",
        ingredients: ["4 bread slices", "1 tomato, sliced", "1 bell pepper, sliced", "Cheese, butter, and pepper"],
        steps: ["Butter the bread and layer the vegetables and cheese.", "Season with pepper and close the sandwich.", "Grill until golden and the cheese melts.", "Slice and serve warm."]
    }
};

document.querySelectorAll(".recipe-filter").forEach((filter) => {
    filter.addEventListener("click", () => {
        selectedCategory = filter.dataset.category;
        document.querySelectorAll(".recipe-filter").forEach((item) =>
            item.classList.remove("active")
        );
        filter.classList.add("active");
        applyRecipeVisibility();
    });
});

document.querySelectorAll(".recipe-card").forEach((card) => {
    card.dataset.choice =
        card.dataset.category === "meals" || card.dataset.category === "snacks"
            ? "eat"
            : "drink";
    card.addEventListener("click", () => showRecipe(card.dataset.recipe));
});

function applyRecipeVisibility() {
    document.querySelectorAll(".recipe-card").forEach((card) => {
        const matchesChoice = browseAllRecipes || card.dataset.choice === selectedChoice;
        const matchesCategory = selectedCategory === "all" ||
            card.dataset.category === selectedCategory;
        card.hidden = !matchesChoice || !matchesCategory;
    });
}

document.querySelectorAll("[data-close-recipe]").forEach((element) => {
    element.addEventListener("click", closeRecipe);
});

function showRecipe(recipeId) {
    const recipe = popularRecipes[recipeId];
    if (!recipe) return;

    document.getElementById("recipe-detail-image").src = recipe.image;
    document.getElementById("recipe-detail-image").alt = recipe.title;
    document.getElementById("recipe-detail-meta").textContent = recipe.meta;
    document.getElementById("recipe-detail-title").textContent = recipe.title;
    document.getElementById("recipe-detail-ingredients").innerHTML =
        recipe.ingredients.map((item) => `<li>${item}</li>`).join("");
    document.getElementById("recipe-detail-steps").innerHTML =
        recipe.steps.map((step) => `<li>${step}</li>`).join("");
    recipeModal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeRecipe() {
    recipeModal.hidden = true;
    document.body.classList.remove("modal-open");
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !recipeModal.hidden) closeRecipe();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const typedIngredients =
        document.getElementById("ingredients").value.trim();
    const selectedIngredients = Array.from(
        document.querySelectorAll('input[name="ingredient"]:checked')
    ).map((item) => item.value);
    const ingredients = [...selectedIngredients, typedIngredients]
        .filter(Boolean)
        .join(", ");

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
        goToPage(3);
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
