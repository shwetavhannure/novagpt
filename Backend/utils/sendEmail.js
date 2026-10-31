import nodemailer from "nodemailer";

/**
 * Sends transactional emails via Resend or SMTP.
 *
 * Returns true ONLY when a provider accepted the message, false otherwise
 * (nothing configured, or the provider rejected it). Callers that must be sure
 * the mail left the server (email verification codes) check this value.
 *
 * Optional env vars:
 *   RESEND_API_KEY, RESEND_FROM       (default sender: onboarding@resend.dev, which Resend only
 *                                      delivers to the Resend account owner until you verify a domain)
 *   SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, SMTP_FROM
 *                                     (defaults to Brevo; for Gmail use SMTP_HOST=smtp.gmail.com,
 *                                      SMTP_PORT=587 and a Google "App password" as SMTP_PASS)
 */
const sendEmail = async (options) => {
    const html = options.html || `<p>${String(options.message || "").replace(/\n/g, "<br>")}</p>`;

    // 1. Resend API
    const resendKey = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim();
    if (resendKey) {
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendKey}`
                },
                body: JSON.stringify({
                    from: process.env.RESEND_FROM || "NovaGPT <onboarding@resend.dev>",
                    to: options.email,
                    subject: options.subject,
                    html
                })
            });
            if (res.ok) {
                console.log("Email sent successfully via Resend!");
                return true;
            }
            const detail = await res.text().catch(() => "");
            console.warn(`Resend rejected the email (${res.status}): ${detail.slice(0, 200)}`);
        } catch (resendErr) {
            console.warn("Resend email failed:", resendErr.message);
        }
    }

    // 2. SMTP
    const smtpUser = process.env.SMTP_USER && process.env.SMTP_USER.trim();
    const smtpPass = process.env.SMTP_PASS && process.env.SMTP_PASS.trim();
    if (smtpUser && smtpPass) {
        try {
            const transporter = nodemailer.createTransport({
                host: (process.env.SMTP_HOST || "smtp-relay.brevo.com").trim(),
                port: Number(process.env.SMTP_PORT) || 587,
                auth: { user: smtpUser, pass: smtpPass }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"NovaGPT Support" <novagpt.support@gmail.com>',
                to: options.email,
                subject: options.subject,
                html
            });
            console.log("Email sent successfully via SMTP!");
            return true;
        } catch (smtpErr) {
            console.warn("SMTP email failed:", smtpErr.message);
        }
    }

    // 3. Nothing could deliver it
    console.log(`[Email Notice] NOT delivered (no working provider). Recipient: ${options.email} | Subject: "${options.subject}"`);
    return false;
};

export default sendEmail;
