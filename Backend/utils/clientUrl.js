import os from "os";

const DEFAULT_FRONTEND_URL = "http://localhost:5174";

const isLoopbackHost = (h) => h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";

const isPrivateNetworkHost = (h) =>
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h);

/** First non-internal IPv4 address of this machine (the address a phone on the same Wi-Fi can reach). */
export const getLanIpAddress = () => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === "IPv4" && !net.internal) return net.address;
        }
    }
    return null;
};

/**
 * Decides which web address goes into emailed links (password reset).
 *
 *  - Production, or PUBLIC_FRONTEND_URL set: always the configured public address.
 *  - Development: the address the user's browser is on, so the link opens on the same kind of device.
 *    If that is "localhost", it is swapped for this computer's LAN IP, because a phone cannot open
 *    "localhost" links from an email (that was the ERR_CONNECTION_REFUSED error).
 *
 * Only localhost / private-network addresses are accepted from the request, so nobody can inject a
 * link that points to a stranger's website.
 */
export const resolveClientBaseUrl = (req) => {
    const configured = (process.env.PUBLIC_FRONTEND_URL || "").trim();
    const fallback = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).trim().replace(/\/+$/, "");

    if (configured) return configured.replace(/\/+$/, "");
    if (process.env.NODE_ENV === "production") return fallback;

    const candidate = req.body?.clientUrl || req.headers?.origin;
    if (!candidate) return fallback;

    let url;
    try {
        url = new URL(candidate);
    } catch {
        return fallback;
    }
    if (!["http:", "https:"].includes(url.protocol)) return fallback;

    const host = url.hostname;
    if (isLoopbackHost(host)) {
        const lan = getLanIpAddress();
        return `${url.protocol}//${lan || host}${url.port ? `:${url.port}` : ""}`;
    }
    if (isPrivateNetworkHost(host)) return url.origin;

    return fallback;
};
