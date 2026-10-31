import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import passport from "passport";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import { getLanIpAddress } from "./utils/clientUrl.js";

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";
const MONGO_CONNECTION_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/novagpt_dummy";

// CORS configuration supporting assigned frontend ports (5174, 5173, 3000)
const isPrivateNetworkHost = (h) =>
    h === "localhost" || h === "127.0.0.1" || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);

const allowedOrigins = [
    FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Local development: allow the laptop's own network address too, so a phone on the same
        // Wi-Fi (http://192.168.x.x:5174) can call the API.
        if (process.env.NODE_ENV !== "production") {
            try {
                const { hostname } = new URL(origin);
                if (isPrivateNetworkHost(hostname)) return callback(null, true);
            } catch { /* fall through */ }
            return callback(null, true); // keep dev permissive to prevent port mismatch blocks
        }
        return callback(null, false); // production: only FRONTEND_URL / PUBLIC_FRONTEND_URL
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body parser & cookie parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Passport initialization (for Google OAuth)
app.use(passport.initialize());

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "NovaGPT Backend API",
        port: PORT,
        dbConnected: mongoose.connection.readyState === 1,
        timestamp: new Date().toISOString()
    });
});

// Mount API Routes
app.use("/api/auth", authRoutes); // Auth: Signup, Login, Password Reset, Google OAuth
app.use("/auth", authRoutes);     // Compatibility mount for /auth/google/callback
app.use("/api/user", userRoutes); // User: Quota, Profile, Settings, Plan Upgrades
app.use("/api", chatRoutes);      // Chat: Conversations, Threads, AI completions

// Connect to MongoDB with friendly diagnostic logging
const connectDB = async () => {    
    try {
        await mongoose.connect(MONGO_CONNECTION_URI);
        console.log("✅ Successfully connected to MongoDB database!");
    } catch(err) {
        console.warn("⚠️ MongoDB connection notice: " + err.message);
        console.warn("   Make sure your local MongoDB service is running (e.g. `net start MongoDB`)");
    }
};

// Start the server on port 5001
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 NovaGPT Server running on http://localhost:${PORT}`);
    const lan = getLanIpAddress();
    if (lan) console.log(`📱 Reachable from your phone (same Wi-Fi): http://${lan}:${PORT}  (open the app at http://${lan}:5174)`);
    connectDB();
});

export default app;
