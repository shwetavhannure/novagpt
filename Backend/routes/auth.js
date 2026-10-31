import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import crypto from "crypto";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import { resolveClientBaseUrl } from "../utils/clientUrl.js";
import sendEmail from "../utils/sendEmail.js";
import { getNextBlockResetTime } from "../utils/quotaHelper.js";
import { validateEmailDeliverability } from "../utils/emailValidator.js";

const router = express.Router();
const getJwtSecret = () => {
    const key = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
    return (key && key.trim()) ? key.trim() : "novagpt_dummy_secure_jwt_secret_key_2026";
};

const PORT = process.env.PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `${BACKEND_URL}/api/auth/google/callback`;

// --- PASSPORT GOOGLE STRATEGY SETUP (if configured) ---
const googleClientId = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim();

if (googleClientId && googleClientSecret) {
    passport.use(new GoogleStrategy({
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const googleEmail = profile.emails[0].value.toLowerCase();
            let user = await User.findOne({ email: googleEmail });
            if (user && user.emailVerifyCodeHash) {
                // Someone started a manual sign-up with this address but never proved ownership.
                // The real owner just proved it via Google: take over the account, drop the unverified password.
                user.password = undefined;
                user.emailVerifyCodeHash = null;
                user.emailVerifyExpires = null;
                user.emailVerifyAttempts = 0;
                user.googleId = profile.id;
                user.isVerified = true;
                await user.save();
            }
            if (!user) {
                user = await User.create({
                    username: profile.displayName,
                    email: googleEmail,
                    googleId: profile.id,
                    isVerified: true,
                    quotaResetAt: getNextBlockResetTime()
                });
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

// --- EMAIL VERIFICATION HELPERS ---
const CODE_TTL_MS = 10 * 60 * 1000;      // code valid for 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;    // 30 s between codes
const MAX_CODE_ATTEMPTS = 5;

const hashCode = (code) => crypto.createHash("sha256").update(`${code}:${getJwtSecret()}`).digest("hex");

const issueVerificationCode = async (user) => {
    const code = String(crypto.randomInt(100000, 1000000));
    user.emailVerifyCodeHash = hashCode(code);
    user.emailVerifyExpires = new Date(Date.now() + CODE_TTL_MS);
    user.emailVerifyAttempts = 0;
    user.emailVerifyLastSent = new Date();
    await user.save();

    const delivered = await sendEmail({
        email: user.email,
        subject: `${code} is your NovaGPT verification code`,
        html: `<div style="font-family:Arial,sans-serif;max-width:420px">
            <h2 style="margin:0 0 8px">Verify your email</h2>
            <p>Hi ${String(user.username).replace(/[<>&]/g, "")}, use this code to finish creating your NovaGPT account:</p>
            <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>
            <p style="color:#666">The code expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>
        </div>`
    });
    return { code, delivered };
};

// --- SIGNUP / REGISTER ROUTE HANDLER ---
// Step 1 of 2: validate the address, create a PENDING account and e-mail a 6-digit code.
// The account only becomes usable after POST /verify-email proves the person owns the mailbox,
// so typed-in fake or someone else's addresses (e.g. shweta@gmail.com) cannot be registered.
const handleRegisterUser = async (req, res) => {
    try {
        const { name, email, password } = req.body; 
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required." });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        // Format, typo, disposable-domain and DNS (MX) checks
        const emailCheck = await validateEmailDeliverability(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ message: emailCheck.error });
        }

        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (user && !user.emailVerifyCodeHash) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        if (user) {
            // Pending (never verified) account: let the person retry with new details, but respect the cooldown
            const wait = RESEND_COOLDOWN_MS - (Date.now() - new Date(user.emailVerifyLastSent || 0).getTime());
            if (wait > 0) {
                return res.status(429).json({ message: `Please wait ${Math.ceil(wait / 1000)}s before requesting another code.` });
            }
            user.username = name.trim();
            user.password = password;      // re-hashed by the pre-save hook
        } else {
            user = new User({
                username: name.trim(),
                email: normalizedEmail,
                password,
                quotaResetAt: getNextBlockResetTime(),
                messageCount: 0,
                plan: "free",
                isVerified: false
            });
        }

        const { code, delivered } = await issueVerificationCode(user);

        if (!delivered) {
            const devShow = process.env.DEV_SHOW_OTP === "true" && process.env.NODE_ENV !== "production";
            if (devShow) {
                console.warn(`[DEV_SHOW_OTP] Email not delivered. Code for ${normalizedEmail}: ${code}`);
                return res.status(201).json({
                    message: "Email service is not configured, so the code is shown here (development only).",
                    needsVerification: true,
                    email: normalizedEmail,
                    devCode: code
                });
            }
            // Strict mode: no verified delivery means no account
            await User.deleteOne({ _id: user._id, emailVerifyCodeHash: { $ne: null } });
            return res.status(503).json({
                message: "We couldn't send the verification email right now. Please try again in a few minutes."
            });
        }

        res.status(201).json({
            message: `We sent a 6-digit verification code to ${normalizedEmail}.`,
            needsVerification: true,
            email: normalizedEmail
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
};

router.post("/signup", handleRegisterUser);
router.post("/register", handleRegisterUser);

// --- Step 2 of 2: verify the emailed code, activate the account and sign the user in ---
router.post("/verify-email", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.code || "").trim();

        const user = await User.findOne({ email });
        if (!user || !user.emailVerifyCodeHash) {
            return res.status(400).json({ message: "No pending verification for this email. Please sign up again." });
        }
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ message: "Enter the 6-digit code from your email." });
        }
        if (!user.emailVerifyExpires || user.emailVerifyExpires.getTime() < Date.now()) {
            return res.status(400).json({ message: "This code has expired. Request a new one." });
        }
        if (user.emailVerifyAttempts >= MAX_CODE_ATTEMPTS) {
            return res.status(429).json({ message: "Too many wrong attempts. Request a new code." });
        }

        const expected = Buffer.from(user.emailVerifyCodeHash, "hex");
        const given = Buffer.from(hashCode(code), "hex");
        const ok = expected.length === given.length && crypto.timingSafeEqual(expected, given);

        if (!ok) {
            user.emailVerifyAttempts += 1;
            await user.save();
            const left = MAX_CODE_ATTEMPTS - user.emailVerifyAttempts;
            return res.status(400).json({ message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code." });
        }

        user.isVerified = true;
        user.emailVerifyCodeHash = null;
        user.emailVerifyExpires = null;
        user.emailVerifyAttempts = 0;
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email }, getJwtSecret(), { expiresIn: "7d" });

        // Welcome email is a courtesy; never block sign-up on it
        sendEmail({
            email: user.email,
            subject: "Welcome to NovaGPT! 🚀",
            message: `Hi ${user.username},\n\nYour email is verified and your NovaGPT account is ready. Start chatting with your AI assistant today!`
        }).catch(() => {});

        res.status(200).json({
            message: "Email verified. Welcome to NovaGPT!",
            token,
            user: { id: user._id, username: user.username, email: user.email, plan: user.plan }
        });
    } catch (err) {
        console.error("Verify email error:", err);
        res.status(500).json({ message: "Verification failed. Please try again." });
    }
});

// --- Send a fresh code to a pending account ---
router.post("/resend-code", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const user = await User.findOne({ email });
        if (!user || !user.emailVerifyCodeHash) {
            return res.status(400).json({ message: "No pending verification for this email. Please sign up again." });
        }
        const wait = RESEND_COOLDOWN_MS - (Date.now() - new Date(user.emailVerifyLastSent || 0).getTime());
        if (wait > 0) {
            return res.status(429).json({ message: `Please wait ${Math.ceil(wait / 1000)}s before requesting another code.` });
        }
        const { code, delivered } = await issueVerificationCode(user);
        const devShow = process.env.DEV_SHOW_OTP === "true" && process.env.NODE_ENV !== "production";
        if (!delivered && !devShow) {
            return res.status(503).json({ message: "We couldn't send the email right now. Please try again in a few minutes." });
        }
        res.status(200).json({ message: "A new code is on its way.", ...(devShow && !delivered ? { devCode: code } : {}) });
    } catch (err) {
        console.error("Resend code error:", err);
        res.status(500).json({ message: "Could not resend the code. Please try again." });
    }
});

// --- LOGIN ROUTE ---
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });
        if (!user || !user.password) {
            return res.status(404).json({ message: "User not found or uses Google Sign-In." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        if (user.emailVerifyCodeHash) {
            return res.status(403).json({
                message: "Please verify your email first. Sign up again with the same email to get a new code.",
                needsVerification: true,
                email: user.email
            });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            getJwtSecret(), 
            { expiresIn: "7d" }
        );

        res.status(200).json({ 
            message: "Logged in successfully",
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email,
                plan: user.plan || "free",
                messageCount: user.messageCount || 0
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GOOGLE OAUTH ROUTES ---
router.get("/google", (req, res, next) => {
    if (!googleClientId || !googleClientSecret) {
        return res.status(501).send("Google OAuth is not configured. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Backend/.env.");
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5174";
    if (!googleClientId || !googleClientSecret) {
        return res.redirect(frontendUrl);
    }
    passport.authenticate("google", { session: false, failureRedirect: `${frontendUrl}?auth_error=google_failed` }, (err, user) => {
        if (err || !user) {
            console.error("Google authentication error:", err?.message || "User profile not resolved");
            return res.redirect(`${frontendUrl}?auth_error=google_failed`);
        }
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            getJwtSecret(), 
            { expiresIn: "7d" }
        );
        res.redirect(`${frontendUrl}?token=${token}`);
    })(req, res, next);
});

// --- FORGOT PASSWORD ---
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ message: "User with this email does not exist." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; 
        await user.save();

        // Address of the site the user is on (laptop or phone), never a hard-coded localhost
        const frontendUrl = resolveClientBaseUrl(req);
        const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset Request - NovaGPT",
                message: `Hi ${user.username},\n\nYou requested a password reset. Click the link below to reset your password (valid for 15 minutes):\n\n${resetLink}\n\nIf you didn't request this, please ignore this email.`
            });
            res.status(200).json({ message: "Password reset link sent to your email." });
        } catch (mailErr) {
            console.warn("Password reset email skipped:", mailErr.message);
            // Never expose the reset link in the API response on a live server: anyone could take over the account.
            const isProd = process.env.NODE_ENV === "production";
            res.status(200).json(isProd
                ? { message: "Password reset link sent to your email." }
                : { message: "Password reset link generated (SMTP in mock mode).", resetLink });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RESET PASSWORD ---
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password has been updated successfully. You can now log in." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;