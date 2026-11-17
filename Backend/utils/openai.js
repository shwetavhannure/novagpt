import "dotenv/config";

// Valid, public Groq model endpoints as required:
// - openai/gpt-oss-20b (Default - Ultra Fast)
// - openai/gpt-oss-120b (High Intelligence)
// - openai/gpt-oss-safeguard-20b (Strict Safety / Moderation)
export const VALID_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-safeguard-20b"
];

export const DEFAULT_MODEL = "openai/gpt-oss-20b";

/**
 * Strict allowlist check. Only the three valid Groq model IDs are ever sent to Groq.
 * Anything else (missing, legacy llama/mixtral/gemma IDs, typos) resolves to the default model.
 */
export const normalizeModel = (model) => {
    if (typeof model !== "string") return DEFAULT_MODEL;
    const clean = model.trim();
    return VALID_MODELS.includes(clean) ? clean : DEFAULT_MODEL;
};

/**
 * Intelligent topic title generator to produce concise 3-4 word titles
 * even when the user inputs raw greetings like "Hiii", "hello", "hey", etc.
 */
export const fallbackTitleGenerator = (message) => {
    if (!message || typeof message !== "string") return "New Conversation";
    
    const trimmed = message.trim();

    // Check for greetings and casual pleasantries
    const isGreeting = /^(hi+|hello+|hey+|howdy|greetings|hola|good\s+(morning|afternoon|evening|day)|yo\b|sup\b|test\b|testing\b)/i.test(trimmed);
    if (isGreeting && trimmed.length < 25) {
        return "General Inquiries & Welcome";
    }

    // Clean conversational filler prefixes
    let clean = trimmed
        .replace(/^["']|["']$/g, "")
        .replace(/^(can you please|can you|please|could you|how do i|how to|what is|tell me about|explain|write a|write an|help me with|create a|give me)\s+/i, "");

    // Split into words and strictly keep 3 to 4 words
    const words = clean.split(/\s+/).filter(Boolean);
    if (!words.length) return "General Discussion";

    // Select 3 to 4 words
    const selectedWords = words.slice(0, 4);
    let title = selectedWords.join(" ");

    // Ensure title has at least 2 words if possible
    if (selectedWords.length === 1 && !isGreeting) {
        title = `${selectedWords[0]} Overview & Notes`;
    }

    // Capitalize first letter of each word for clean presentation
    title = title
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    // Remove any trailing punctuation
    title = title.replace(/[.,:;!?]+$/, "");
    return title.slice(0, 32);
};

/**
 * Generates a concise, professional 3-4 word topic-based title
 */
export const generateThreadTitle = async (firstMessage) => {
    const trimmed = (firstMessage || "").trim();

    // Fast check for common greetings to avoid unnecessary API roundtrips
    if (/^(hi+|hello+|hey+|howdy|greetings|hola|yo\b|test\b)/i.test(trimmed) && trimmed.length < 20) {
        return "General Inquiries & Welcome";
    }

    const apiKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim();

    if (!apiKey || apiKey === "dummy_groq_api_key_here" || apiKey.includes("dummy")) {
        return fallbackTitleGenerator(firstMessage);
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an AI thread title generator. Generate a concise, professional 3 to 4 word topic title summarizing the user's inquiry. If the user only says a greeting like 'hi' or 'hello', output 'General Inquiries & Welcome'. Never output raw greeting words. Output ONLY the 3 to 4 word title without quotes or punctuation."
                },
                {
                    role: "user",
                    content: firstMessage.slice(0, 400)
                }
            ],
            temperature: 0.2,
            reasoning_effort: "low",
            max_completion_tokens: 80
        })
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", options);
        if (!response.ok) {
            return fallbackTitleGenerator(firstMessage);
        }
        const data = await response.json();
        const rawTitle = data.choices?.[0]?.message?.content?.trim();
        if (rawTitle && rawTitle.split(/\s+/).length <= 6) {
            const cleanTitle = rawTitle
                .replace(/^["'`]|["'`]$/g, "")
                .replace(/[.]+$/, "")
                .trim();

            if (!/^(hi+|hello+|hey+)$/i.test(cleanTitle)) {
                return cleanTitle.slice(0, 36);
            }
        }
        return fallbackTitleGenerator(firstMessage);
    } catch (err) {
        return fallbackTitleGenerator(firstMessage);
    }
};

/**
 * Sends the user prompt to Groq using EXACTLY the model that was selected.
 * No silent fallback to other models: if Groq rejects the request, the real reason is returned to the UI.
 */
const getOpenAIAPIResponse = async (message, requestedModel, conversationHistory = []) => {
    const apiKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim();

    if (!apiKey || apiKey === "dummy_groq_api_key_here" || apiKey.includes("dummy")) {
        return `[NovaGPT Sandbox Workspace]\n\nHello! I received your query:\n> "${message}"\n\nAll features, dynamic thread naming, quota tracking, and prompt libraries are active. To connect to live inference, supply your \`GROQ_API_KEY\` in \`Backend/.env\`.`;
    }

    const selectedModel = normalizeModel(requestedModel);
    // Keep the recent turns so short follow-ups ("explain that", "what about the other one?")
    // are interpreted in the context of this thread. Only accept chat roles stored by our app.
    const recentHistory = Array.isArray(conversationHistory)
        ? conversationHistory
            .slice(-20)
            .filter(item => (item?.role === "user" || item?.role === "assistant") && typeof item.content === "string")
            .map(item => ({ role: item.role, content: item.content }))
        : [];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            messages: [
                {
                    role: "system",
                    content: `You are NovaGPT, a helpful AI assistant. Answer the user's actual question directly, with clear, accurate content and suitable markdown. Do not add an unsolicited introduction, disclaimer, preface, or sign-off about being NovaGPT, being an AI, your model, or your provider. In particular, never write phrases such as "Answering from the perspective of NovaGPT", "As NovaGPT", or "powered by ..." unless the user directly asks about your identity or model. Be truthful if directly asked: you are the assistant in the NovaGPT application, this chat uses the "${selectedModel}" model through Groq's API, and you are not ChatGPT or a GPT-4-based OpenAI assistant. Do not invent who developed the app; if asked and you lack verified information, say you don't know. Otherwise, keep the response focused only on the user's topic.`
                },
                ...recentHistory,
                {
                    role: "user",
                    content: message
                }
            ]
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = data.error?.message || `Groq request failed with status ${response.status}`;
        console.warn(`Groq request with model "${selectedModel}" failed (${response.status}): ${errorMsg}`);
        throw new Error(`[${selectedModel}] ${errorMsg}`);
    }

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
        throw new Error(`[${selectedModel}] The model returned an empty reply. Please try again.`);
    }
    return rawContent.replace(/[\u200B-\u200D\uFEFF\u202F\u00A0]/g, " ");
};

export default getOpenAIAPIResponse;
