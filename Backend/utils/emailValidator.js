import dns from "dns/promises";

// Popular throwaway, fake, or non-deliverable email providers
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "tempmail.com",
    "10minutemail.com",
    "guerrillamail.com",
    "sharklasers.com",
    "yopmail.com",
    "trashmail.com",
    "dispostable.com",
    "throwawaymail.com",
    "fakemailgenerator.com",
    "temp-mail.org",
    "getairmail.com",
    "mytemp.email",
    "test.com",
    "example.com",
    "fake.com",
    "dummy.com",
    "asdf.com"
]);

// Well-known trusted mail domains that have guaranteed MX records
const TRUSTED_DOMAINS = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.co.uk",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "aol.com"
]);

// Common typos of big providers: caught early with a helpful hint
const DOMAIN_TYPOS = {
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.con": "gmail.com",
    "gnail.com": "gmail.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com"
};

/**
 * Validates format, blocks disposable domains, and verifies domain DNS MX records.
 * Returns { valid: boolean, error?: string }
 */
export async function validateEmailDeliverability(email) {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Email address is required." };
    }

    const trimmed = email.trim().toLowerCase();

    // 1. Strict regex syntax validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: "Please enter a valid email address format (e.g. name@domain.com)." };
    }

    const parts = trimmed.split("@");
    if (parts.length !== 2) {
        return { valid: false, error: "Invalid email address structure." };
    }

    const [localPart, domain] = parts;

    if (localPart.length > 64 || trimmed.length > 254) {
        return { valid: false, error: "Email address exceeds maximum character length." };
    }

    // 2. Disposable / fake domain blacklist check
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { valid: false, error: "Temporary and disposable email addresses are not allowed. Please use a permanent email." };
    }

    if (DOMAIN_TYPOS[domain]) {
        return { valid: false, error: `Did you mean @${DOMAIN_TYPOS[domain]}? "@${domain}" looks like a typo.` };
    }

    // 3. Fast-path check for major public email providers
    if (TRUSTED_DOMAINS.has(domain)) {
        return { valid: true };
    }

    // 4. DNS deliverability check: the domain must have a mail server (MX) or, per RFC 5321, an A record
    const withTimeout = (promise) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("DNS_TIMEOUT"), { code: "DNS_TIMEOUT" })), 2500))
    ]);

    try {
        let mxRecords = [];
        try {
            mxRecords = await withTimeout(dns.resolveMx(domain));
        } catch (mxErr) {
            // Only "no such record" falls through to the A-record check; anything else is a DNS problem on our side
            if (mxErr.code !== "ENODATA" && mxErr.code !== "ENOTFOUND") throw mxErr;
        }

        // "Null MX" (a single "." exchange) means the domain explicitly accepts no mail
        const hasRealMx = mxRecords.some((r) => r.exchange && r.exchange !== ".");
        if (hasRealMx) return { valid: true };

        const aRecords = await withTimeout(dns.resolve4(domain)).catch((e) => {
            if (e.code !== "ENODATA" && e.code !== "ENOTFOUND") throw e;
            return [];
        });
        if (aRecords.length > 0) return { valid: true };

        return { valid: false, error: `The email domain "@${domain}" does not exist or cannot receive mail.` };
    } catch (dnsErr) {
        // Slow or broken DNS on our side should not block a real user from signing up
        return { valid: true };
    }
}
