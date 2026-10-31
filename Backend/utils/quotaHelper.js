/**
 * Calculates the next hourly session block reset timestamp.
 * Resets quota 1 hour after the block begins.
 */
export const FREE_DAILY_LIMIT = 20;
export const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour block

export function getNextBlockResetTime(fromTime = new Date()) {
    const base = new Date(fromTime);
    return new Date(base.getTime() + BLOCK_DURATION_MS);
}

export function formatWaitTime(resetDate) {
    if (!resetDate) return "1 hour";
    const diff = new Date(resetDate).getTime() - Date.now();
    if (diff <= 0) return "a few moments";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.ceil((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
