import nodemailer from "nodemailer";

/**
 * Send transactional email through Brevo's HTTPS API first. This works on
 * Render's free tier, which blocks outbound SMTP ports. Resend is an optional
 * fallback when an explicitly verified sender is configured. SMTP is kept for
 * local development (or an explicitly enabled paid production service).
 *
 * Environment variables:
 *   BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME
 *   RESEND_API_KEY, RESEND_FROM (optional fallback; RESEND_FROM must be set)
 *   SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, SMTP_FROM (local fallback)
 *   EMAIL_TIMEOUT_MS (optional; defaults to 8000)
 */
const sendEmail = async (options) => {
    const html = options.html || `<p>${String(options.message || "").replace(/\n/g, "<br>")}</p>`;
    const providerTimeoutMs = Number(process.env.EMAIL_TIMEOUT_MS) || 8000;

    // 1. Brevo HTTP API (works on Render free tier).
    const brevoKey = process.env.BREVO_API_KEY?.trim();
    const brevoFrom = process.env.BREVO_FROM_EMAIL?.trim();
    if (brevoKey && brevoFrom) {
        try {
            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "content-type": "application/json",
                    "api-key": brevoKey
                },
                body: JSON.stringify({
                    sender: {
                        name: process.env.BREVO_FROM_NAME?.trim() || "NovaGPT Support",
                        email: brevoFrom
                    },
                    to: [{ email: options.email }],
                    subject: options.subject,
                    htmlContent: html
                }),
                signal: AbortSignal.timeout(providerTimeoutMs)
            });

            if (res.ok) {
                console.log("Email accepted by Brevo API.");
                return true;
            }
            const detail = await res.text().catch(() => "");
            console.warn(`Brevo rejected the email (${res.status}): ${detail.slice(0, 200)}`);
        } catch (brevoErr) {
            console.warn("Brevo API email failed:", brevoErr.message);
        }
    } else if (brevoKey && !brevoFrom) {
        console.warn("Brevo API is configured, but BREVO_FROM_EMAIL is missing.");
    }

    // 2. Optional Resend fallback. Require an explicit sender so the restricted
    // onboarding@resend.dev test sender is never used for arbitrary recipients.
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const resendFrom = process.env.RESEND_FROM?.trim();
    if (resendKey && resendFrom) {
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${resendKey}`
                },
                body: JSON.stringify({
                    from: resendFrom,
                    to: options.email,
                    subject: options.subject,
                    html
                }),
                signal: AbortSignal.timeout(providerTimeoutMs)
            });

            if (res.ok) {
                console.log("Email accepted by Resend API.");
                return true;
            }
            const detail = await res.text().catch(() => "");
            console.warn(`Resend rejected the email (${res.status}): ${detail.slice(0, 200)}`);
        } catch (resendErr) {
            console.warn("Resend email failed:", resendErr.message);
        }
    }

    // 3. SMTP fallback for local development. Render free web services block
    // SMTP ports 25, 465 and 587. Set ALLOW_SMTP_IN_PRODUCTION=true only when
    // deploying somewhere that permits outbound SMTP.
    const smtpAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_SMTP_IN_PRODUCTION === "true";
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    if (smtpAllowed && smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: (process.env.SMTP_HOST || "smtp-relay.brevo.com").trim(),
                port: Number(process.env.SMTP_PORT) || 587,
                connectionTimeout: providerTimeoutMs,
                greetingTimeout: providerTimeoutMs,
                socketTimeout: providerTimeoutMs,
                auth: { user: smtpUser, pass: smtpPass }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || brevoFrom || smtpUser,
                to: options.email,
                subject: options.subject,
                html,
                text: options.message
            });
            console.log("Email accepted by SMTP server.");
            return true;
        } catch (smtpErr) {
            console.warn("SMTP email failed:", smtpErr.message);
        }
    }

    console.warn(`[Email Notice] NOT delivered. Recipient: ${options.email} | Subject: "${options.subject}"`);
    return false;
};

export default sendEmail;
