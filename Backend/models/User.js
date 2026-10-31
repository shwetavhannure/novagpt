import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { 
        type: String, 
        required: function() { return !this.googleId; } 
    },
    googleId: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    // Email ownership verification (6-digit code). While emailVerifyCodeHash is set the account is "pending".
    emailVerifyCodeHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    emailVerifyAttempts: { type: Number, default: 0 },
    emailVerifyLastSent: { type: Date, default: null },
    // Password reset fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // SaaS Plan & Quota Tracking
    plan: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free"
    },
    messageCount: {
        type: Number,
        default: 0
    },
    quotaResetAt: {
        type: Date,
        default: null
    },

    // User preferences for Settings modal
    preferences: {
        theme: { type: String, default: "dark" },
        zenMode: { type: Boolean, default: false },
        soundEnabled: { type: Boolean, default: false },
        enterToSend: { type: Boolean, default: true },
        modelPreference: { type: String, default: "openai/gpt-oss-20b" }
    }
}, { timestamps: true });

// Pre-save hook to hash password if modified
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) return;
    this.password = await bcrypt.hash(this.password, 12);
});

export default mongoose.model("User", userSchema);