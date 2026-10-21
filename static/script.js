const form = document.getElementById("recipe-form");
const button = document.getElementById("generate-btn");
const results = document.getElementById("results");
const output = document.getElementById("recipe-output");
const recipeModal = document.getElementById("recipe-modal");
const pages = document.querySelectorAll(".wizard-page");
const voiceBtn = document.getElementById("voice-btn");
const voiceStatus = document.getElementById("voice-status");
const ingredientsInput = document.getElementById("ingredients");
const speakRecipeBtn = document.getElementById("speak-recipe-btn");
const voiceSelect = document.getElementById("voice-select");
const speechRate = document.getElementById("speech-rate");
const speechRateValue = document.getElementById("speech-rate-value");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatSendButton = document.getElementById("chat-send-btn");
const chatVoiceButton = document.getElementById("chat-voice-btn");
const chatStatus = document.getElementById("chat-status");
const startConversationButton = document.getElementById("start-conversation-btn");
const chatStopButton = document.getElementById("chat-stop-btn");
const chatReplayButton = document.getElementById("chat-replay-btn");
const finishConversationButton = document.getElementById("finish-conversation-btn");
let selectedChoice = "eat";
let selectedCategory = "all";
let browseAllRecipes = false;
let currentRecipeText = "";
let lastSpokenText = "";
let availableVoices = [];
const messages = [];
let conversationRecognition = null;
let conversationActive = false;
let conversationWaitingForReply = false;

function setupAudioRecorder(buttonElement, statusElement, onTranscript) {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
        buttonElement.disabled = true;
        statusElement.textContent =
            "Audio recording is not supported in this browser. Please type your message.";
        return;
    }

    let recorder = null;
    let chunks = [];
    let recordingTimer = null;

    buttonElement.addEventListener("click", async () => {
        if (recorder && recorder.state === "recording") {
            recorder.stop();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream);
            chunks = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            };
            recorder.onerror = () => {
                window.clearTimeout(recordingTimer);
                stream.getTracks().forEach((track) => track.stop());
                recorder = null;
                buttonElement.disabled = false;
                buttonElement.textContent = buttonElement.id === "voice-btn"
                    ? "🎙️ Speak Ingredients"
                    : "🎙️";
                statusElement.textContent = "Recording failed. Please try again.";
            };
            recorder.onstop = async () => {
                window.clearTimeout(recordingTimer);
                stream.getTracks().forEach((track) => track.stop());
                buttonElement.disabled = true;
                statusElement.textContent = "Transcribing...";
                let transcriptionTimer = null;
                try {
                    const recordedAudio = new Blob(chunks, {
                        type: recorder.mimeType || "audio/webm"
                    });
                    const audio = await convertToWav(recordedAudio);
                    const formData = new FormData();
                    formData.append("audio", audio, "voice-message.wav");
                    const controller = new AbortController();
                    transcriptionTimer = window.setTimeout(() => controller.abort(), 65000);
                    const response = await fetch("/transcribe", {
                        method: "POST",
                        body: formData,
                        signal: controller.signal
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Transcription failed.");
                    onTranscript(data.text);
                    statusElement.textContent = `Recognized: ${data.text}`;
                } catch (error) {
                    statusElement.textContent = error.name === "AbortError"
                        ? "Transcription took too long. Please try again."
                        : error.message || "The recording could not be transcribed. Please try again.";
                } finally {
                    window.clearTimeout(transcriptionTimer);
                    buttonElement.disabled = false;
                    buttonElement.textContent = buttonElement.id === "voice-btn"
                        ? "🎙️ Speak Ingredients"
                        : "🎙️";
                }
            };
            recorder.start();
            recordingTimer = window.setTimeout(() => recorder.stop(), 60000);
            buttonElement.textContent = "⏹️ Stop recording";
            statusElement.textContent = "Listening... Speak now, then stop recording.";
        } catch (error) {
            statusElement.textContent =
                "Microphone access was blocked. Allow microphone access, then try again.";
        }
    });
}

async function convertToWav(recordedAudio) {
    const audioContext = new AudioContext();
    try {
        const buffer = await audioContext.decodeAudioData(await recordedAudio.arrayBuffer());
        const channelCount = Math.min(buffer.numberOfChannels, 2);
        const sampleRate = buffer.sampleRate;
        const frameCount = buffer.length;
        const wav = new ArrayBuffer(44 + frameCount * channelCount * 2);
        const view = new DataView(wav);
        const writeString = (offset, value) => {
            for (let index = 0; index < value.length; index += 1) {
                view.setUint8(offset + index, value.charCodeAt(index));
            }
        };
        writeString(0, "RIFF");
        view.setUint32(4, 36 + frameCount * channelCount * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channelCount, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * channelCount * 2, true);
        view.setUint16(32, channelCount * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, frameCount * channelCount * 2, true);

        const channels = Array.from({ length: channelCount }, (_, index) =>
            buffer.getChannelData(index)
        );
        let offset = 44;
        for (let index = 0; index < frameCount; index += 1) {
            for (let channel = 0; channel < channelCount; channel += 1) {
                const sample = Math.max(-1, Math.min(1, channels[channel][index]));
                view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
                offset += 2;
            }
        }
        return new Blob([wav], { type: "audio/wav" });
    } finally {
        await audioContext.close();
    }
}

setupAudioRecorder(voiceBtn, voiceStatus, (text) => {
    ingredientsInput.value = text;
});

function loadSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    availableVoices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";
    availableVoices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
}

function speakRecipe(text, onEnd = null) {
    if (!("speechSynthesis" in window)) {
        voiceStatus.textContent = "Speech output is not supported in this browser.";
        if (onEnd) onEnd();
        return;
    }

    lastSpokenText = text;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    speech.rate = Number(speechRate.value);
    speech.pitch = 1;
    const selectedVoice = availableVoices[Number(voiceSelect.value)];
    if (selectedVoice) speech.voice = selectedVoice;
    speech.onend = () => {
        if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(speech);
}

function replayLastResponse() {
    if (!lastSpokenText) return;
    if (conversationActive && conversationRecognition) conversationRecognition.stop();
    speakRecipe(lastSpokenText, startConversationRecognition);
}

function addChatMessage(role, text) {
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(text) {
    const message = text.trim();
    if (!message) return;

    messages.push({ role: "user", content: message });
    addChatMessage("user", message);
    chatInput.value = "";
    chatSendButton.disabled = true;
    chatStatus.textContent = "Your AI chef is thinking...";
    conversationWaitingForReply = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65000);

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
            signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to get a response.");

        messages.push({ role: "assistant", content: data.reply });
        addChatMessage("assistant", data.reply);
        speakRecipe(data.reply, () => {
            conversationWaitingForReply = false;
            startConversationRecognition();
        });
        chatReplayButton.disabled = false;
        chatStatus.textContent = "";
    } catch (error) {
        chatStatus.textContent = error.name === "AbortError"
            ? "The assistant took too long to respond. Please try again."
            : error.message || "Could not connect to the cooking assistant.";
    } finally {
        window.clearTimeout(timeout);
        chatSendButton.disabled = false;
        conversationWaitingForReply = false;
        startConversationRecognition();
        chatInput.focus();
    }
}

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(chatInput.value);
});

function startConversationRecognition() {
    if (!conversationActive || conversationWaitingForReply || !conversationRecognition) return;
    try {
        conversationRecognition.start();
    } catch (error) {
        if (error.name !== "InvalidStateError") {
            chatStatus.textContent = "Microphone listening could not restart. Please try again.";
        }
    }
}

function endConversation() {
    conversationActive = false;
    conversationWaitingForReply = false;
    if (conversationRecognition) conversationRecognition.stop();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    chatVoiceButton.textContent = "🎙️ Start listening";
    chatStatus.textContent = "Conversation ended.";
}

function setupContinuousConversation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        chatVoiceButton.disabled = true;
        chatStatus.textContent =
            "Continuous voice conversation is not supported in this browser. Use Chrome or type your message.";
        return;
    }

    conversationRecognition = new SpeechRecognition();
    conversationRecognition.continuous = true;
    conversationRecognition.interimResults = false;
    conversationRecognition.lang = "en-IN";
    conversationRecognition.onstart = () => {
        chatVoiceButton.textContent = "⏹ End conversation";
        chatStatus.textContent = "Listening... speak naturally. I will respond after each sentence.";
    };
    conversationRecognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .slice(event.resultIndex)
            .filter((result) => result.isFinal)
            .map((result) => result[0].transcript)
            .join(" ")
            .trim();
        if (transcript) {
            conversationRecognition.stop();
            sendMessage(transcript);
        }
    };
    conversationRecognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            conversationActive = false;
            chatVoiceButton.textContent = "🎙️ Start listening";
            chatStatus.textContent = "Microphone access was blocked. Allow it and start listening again.";
        } else if (event.error !== "aborted") {
            chatStatus.textContent = "I could not hear that. Keep speaking, or try again.";
        }
    };
    conversationRecognition.onend = () => {
        if (conversationActive && !conversationWaitingForReply) {
            window.setTimeout(startConversationRecognition, 250);
        }
    };
}

setupContinuousConversation();

chatVoiceButton.addEventListener("click", () => {
    if (conversationActive) {
        endConversation();
        return;
    }
    conversationActive = true;
    startConversationRecognition();
});

startConversationButton.addEventListener("click", () => {
    goToPage(2);
    chatInput.focus();
    if (!conversationActive) {
        conversationActive = true;
        speakRecipe(
            "Hi! I am your AI chef. Tell me what ingredients you have and what you feel like cooking.",
            startConversationRecognition
        );
    }
});

chatStopButton.addEventListener("click", endConversation);
chatReplayButton.addEventListener("click", replayLastResponse);

finishConversationButton.addEventListener("click", async () => {
    if (!messages.some((message) => message.role === "user")) {
        chatStatus.textContent = "Tell me about your ingredients first, then I can create your recipe.";
        chatInput.focus();
        return;
    }

    finishConversationButton.disabled = true;
    chatStatus.textContent = "Your AI chef is writing the full recipe...";
    try {
        const response = await fetch("/generate-conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not create the recipe.");
        output.textContent = formatRecipe(data);
        currentRecipeText = output.textContent;
        goToPage(3);
        speakRecipe(currentRecipeText);
        chatStatus.textContent = "";
    } catch (error) {
        chatStatus.textContent = error.message || "Could not create the recipe.";
    } finally {
        finishConversationButton.disabled = false;
    }
});

loadSpeechVoices();
if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", loadSpeechVoices);
}
speakRecipeBtn.addEventListener("click", () => speakRecipe(currentRecipeText));
speechRate.addEventListener("input", () => {
    speechRateValue.textContent = `${speechRate.value}x`;
});

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
        currentRecipeText = output.textContent;
        speakRecipe(currentRecipeText);
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
