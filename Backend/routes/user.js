import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { normalizeModel } from "../utils/openai.js";
import { getNextBlockResetTime, formatWaitTime, FREE_DAILY_LIMIT } from "../utils/quotaHelper.js";

const router = express.Router();

/**
 * GET /api/user/quota
 * Returns current prompt quota (limit 20), plan tier, and session reset timestamp.
 */
router.get("/quota", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const now = new Date();
        if (!user.quotaResetAt || now.getTime() >= new Date(user.quotaResetAt).getTime()) {
            user.messageCount = 0;
            user.quotaResetAt = getNextBlockResetTime();
            await user.save();
        }

        const limit = user.plan === "pro" || user.plan === "enterprise" ? 999999 : FREE_DAILY_LIMIT;
        const remaining = limit === 999999 ? 999999 : Math.max(0, limit - (user.messageCount || 0));

        res.json({
            plan: user.plan || "free",
            messageCount: user.messageCount || 0,
            limit,
            remaining,
            resetTime: user.quotaResetAt,
            waitText: formatWaitTime(user.quotaResetAt)
        });
    } catch (err) {
        console.error("Error fetching user quota:", err);
        res.status(500).json({ error: "Failed to fetch quota information" });
    }
});

/**
 * GET /api/user/me
 * Returns user profile, current plan, preferences, and account metadata.
 */
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password -resetPasswordToken -resetPasswordExpires");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const now = new Date();
        if (!user.quotaResetAt || now.getTime() >= new Date(user.quotaResetAt).getTime()) {
            user.messageCount = 0;
            user.quotaResetAt = getNextBlockResetTime();
            await user.save();
        }

        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            plan: user.plan || "free",
            messageCount: user.messageCount || 0,
            quotaResetAt: user.quotaResetAt,
            preferences: {
                theme: user.preferences?.theme || "dark",
                // Old accounts may still hold a retired model ID; always return a valid one.
                modelPreference: normalizeModel(user.preferences?.modelPreference)
            },
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

/**
 * PUT /api/user/settings
 * Updates preferences or profile name.
 */
router.put("/settings", authMiddleware, async (req, res) => {
    try {
        const { username, preferences } = req.body;
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (username && typeof username === "string" && username.trim()) {
            user.username = username.trim();
        }

        if (preferences && typeof preferences === "object") {
            const current = user.toObject().preferences || {};
            const next = { ...current, ...preferences };
            next.modelPreference = normalizeModel(next.modelPreference);
            user.preferences = next;
        }

        await user.save();
        res.json({
            message: "Settings updated successfully",
            username: user.username,
            preferences: user.preferences
        });
    } catch (err) {
        console.error("Error updating settings:", err);
        res.status(500).json({ error: "Failed to update settings" });
    }
});

/**
 * POST /api/user/upgrade
 * Informational sandbox endpoint.
 */
router.post("/upgrade", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "Standard NovaGPT sandbox workspace active with full feature enablement.",
            plan: user.plan || "free"
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to process request" });
    }
});

export default router;
