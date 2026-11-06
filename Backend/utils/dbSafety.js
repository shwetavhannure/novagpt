import mongoose from "mongoose";
import Thread from "../models/Thread.js";

/**
 * Chats must only ever be removed when the user clicks "delete" on a chat.
 *
 * MongoDB can silently delete documents by itself if a "TTL index" (expireAfterSeconds) exists on a
 * collection. Such an index survives in the database even after the code that created it was
 * changed, so on every start-up we look for one on the threads collection and remove it.
 */
export const ensureChatsNeverExpire = async () => {
    try {
        const indexes = await Thread.collection.indexes();
        for (const idx of indexes) {
            if (idx.expireAfterSeconds !== undefined) {
                await Thread.collection.dropIndex(idx.name);
                console.log(`🛡️  Removed an auto-delete (TTL) index "${idx.name}" from chats. Chats are now kept until you delete them.`);
            }
        }
    } catch (err) {
        // "ns does not exist" just means no chat has been saved yet: nothing to clean up
        if (err.codeName !== "NamespaceNotFound" && !/ns does not exist/i.test(err.message || "")) {
            console.warn("Could not check chat indexes:", err.message);
        }
    }
};

/** Prints which database the chats live in, so it is obvious when the app points at a different one. */
export const logDatabaseTarget = () => {
    const { host, name } = mongoose.connection;
    console.log(`💾 Chats are stored in database "${name}" on ${host}. Use the same MONGODB_URI every time to keep seeing the same chats.`);
};
