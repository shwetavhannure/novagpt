import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Messages don't exist outside a thread, so both schemas live in this one file
const ThreadSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true   // every thread belongs to one user
    },
    threadId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        default: "New Chat"
    },
    messages: [MessageSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// NOTE: never add `expires` / expireAfterSeconds here: it would make MongoDB delete old chats automatically.
// Chats are removed only by DELETE /api/thread/:threadId (the delete button in the sidebar).
export default mongoose.model("Thread", ThreadSchema);