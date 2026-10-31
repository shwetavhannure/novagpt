/**
 * Global Frontend Configuration
 *
 * The API address is resolved at runtime so the app works on a laptop AND on a phone/tablet
 * opened through the laptop's network address (e.g. http://192.168.1.20:5174):
 *
 *   1. VITE_API_URL (set it in Frontend/.env for deployed builds), e.g. https://api.mysite.com
 *   2. otherwise: same host the page was opened from, on the backend port (default 5001).
 *      Opened as localhost  -> http://localhost:5001
 *      Opened from a phone  -> http://<laptop-ip>:5001
 *
 * Never hard-code "localhost" here: on a phone "localhost" is the phone itself,
 * which is what caused ERR_CONNECTION_REFUSED.
 */
const trimSlash = (url) => String(url).replace(/\/+$/, "");

const resolveApiBaseUrl = () => {
    const fromEnv = import.meta.env.VITE_API_URL;
    if (fromEnv && String(fromEnv).trim()) return trimSlash(fromEnv.trim());

    const port = import.meta.env.VITE_API_PORT || "5001";
    const { protocol, hostname } = window.location;
    const host = hostname.includes(":") ? `[${hostname}]` : hostname; // IPv6 literal
    return `${protocol}//${host}:${port}`;
};

export const API_BASE_URL = resolveApiBaseUrl();
