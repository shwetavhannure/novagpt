/**
 * The only Groq models NovaGPT uses. Keep this list in sync with Backend/utils/openai.js.
 */
export const MODEL_OPTIONS = [
    { id: "openai/gpt-oss-20b", label: "Default - Ultra Fast", short: "Default - Ultra Fast inference" },
    { id: "openai/gpt-oss-120b", label: "High Intelligence", short: "High Intelligence & complex logic" },
    { id: "openai/gpt-oss-safeguard-20b", label: "Strict Safety / Moderation", short: "Strict Safety & content moderation" }
];

export const VALID_MODELS = MODEL_OPTIONS.map((m) => m.id);
export const DEFAULT_MODEL = MODEL_OPTIONS[0].id;
