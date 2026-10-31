import express from "express";
import Thread from "../models/Thread.js";
import User from "../models/User.js";
import getOpenAIAPIResponse, { generateThreadTitle, normalizeModel } from "../utils/openai.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { getNextBlockResetTime, formatWaitTime, FREE_DAILY_LIMIT } from "../utils/quotaHelper.js";

const router = express.Router();

// 1st route -> Get all threads of the logged-in user (newest first)
router.get("/thread", authMiddleware, async (req, res) => {
    try {
        const threads = await Thread.find({ userId: req.userId })
            .select("threadId title updatedAt createdAt")
            .sort({ updatedAt: -1 });
        res.json(threads);
    } catch (err) {
        console.error("Failed to fetch threads:", err);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
});

// 2nd route -> Get messages of one thread
router.get("/thread/:threadId", authMiddleware, async (req, res) => {
    const { threadId } = req.params;
    try {
        const thread = await Thread.findOne({ threadId, userId: req.userId });

        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.json(thread.messages);
    } catch (err) {
        console.error("Failed to fetch messages for thread:", err);
        res.status(500).json({ error: "Failed to fetch chat messages" });
    }
});

// 3rd route -> Delete one thread
router.delete("/thread/:threadId", authMiddleware, async (req, res) => {
    const { threadId } = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({ threadId, userId: req.userId });

        if (!deletedThread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.status(200).json({ success: "Thread deleted successfully" });
    } catch (err) {
        console.error("Failed to delete thread:", err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

// 4th route -> Send a message, enforce 20-prompt session quota, dynamically title thread, save and return AI reply
router.post("/chat", authMiddleware, async (req, res) => {
    const { threadId, message, model } = req.body;

    if (!threadId || !message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Missing required fields: threadId and message are required." });
    }

    try {
        // --- 1. SESSION QUOTA LIMIT PROTECTION ---
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "User account not found." });
        }

        const now = new Date();
        // Check if session quota block has expired
        if (!user.quotaResetAt || now.getTime() >= new Date(user.quotaResetAt).getTime()) {
            user.messageCount = 0;
            user.quotaResetAt = getNextBlockResetTime();
        }

        const isFreeTier = !user.plan || user.plan === "free";
        if (isFreeTier && user.messageCount >= FREE_DAILY_LIMIT) {
            const waitText = formatWaitTime(user.quotaResetAt);
            return res.status(429).json({
                error: "QUOTA_EXCEEDED",
                message: `You've reached your limit of 20 prompts. Please wait ${waitText} until your quota resets.`,
                resetTime: user.quotaResetAt,
                waitText,
                limit: FREE_DAILY_LIMIT,
                remaining: 0,
                current: user.messageCount
            });
        }

        // --- 2. DYNAMIC AI TOPIC THREAD TITLING ---
        let existingThread = await Thread.findOne({ threadId, userId: req.userId });
        let threadTitle = existingThread ? existingThread.title : null;

        // If this is a new thread (or untitled default), dynamically generate concise 3-4 word title
        if (!existingThread || !threadTitle || threadTitle === "New Chat") {
            threadTitle = await generateThreadTitle(message);
        }

        // --- 3. GET AI ASSISTANT COMPLETION ---
        // The model picked in the UI (req.body.model) is used exactly; only the 3 valid Groq IDs are accepted.
        const activeModel = normalizeModel(model || user.preferences?.modelPreference);
        const assistantReply = await getOpenAIAPIResponse(message, activeModel);

        // --- 4. PERSIST CONVERSATION IN THREAD ---
        const updatedThread = await Thread.findOneAndUpdate(
            { threadId, userId: req.userId },
            {
                $setOnInsert: { createdAt: new Date() },
                $set: { title: threadTitle, updatedAt: new Date() },
                $push: {
                    messages: {
                        $each: [
                            { role: "user", content: message, timestamp: new Date() },
                            { role: "assistant", content: assistantReply, timestamp: new Date() }
                        ]
                    }
                }
            },
            { upsert: true, new: true }
        );

        // --- 5. UPDATE USER QUOTA COUNT ---
        if (isFreeTier) {
            user.messageCount += 1;
        }
        await user.save();

        const remainingQuota = isFreeTier ? Math.max(0, FREE_DAILY_LIMIT - user.messageCount) : 999999;
        const waitText = formatWaitTime(user.quotaResetAt);

        res.json({
            reply: assistantReply,
            model: activeModel,
            threadTitle: updatedThread.title,
            quota: {
                messageCount: user.messageCount,
                limit: isFreeTier ? FREE_DAILY_LIMIT : 999999,
                remaining: remainingQuota,
                resetTime: user.quotaResetAt,
                waitText,
                plan: user.plan || "free"
            }
        });
    } catch (err) {
        console.error("Chat Route Error:", err.message);
        res.status(500).json({ error: err.message || "Something went wrong while generating response." });
    }
});

export default router;