import React, { useState, useEffect } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { API_BASE_URL } from "./config.js";

export default function Register({ onSwitchToSignIn, setIsAuthenticated }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Step 2: e-mail ownership check (6-digit code)
    const [step, setStep] = useState("details"); // "details" | "verify"
    const [pendingEmail, setPendingEmail] = useState("");
    const [code, setCode] = useState("");
    const [resendIn, setResendIn] = useState(0);
    const [devCode, setDevCode] = useState("");

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed.");
            }

            // The server e-mailed a code: the account is created only after the person enters it
            setPendingEmail(data.email || email.trim().toLowerCase());
            setDevCode(data.devCode || "");
            setCode("");
            setResendIn(30);
            setStep("verify");
            setIsLoading(false);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!/^\d{6}$/.test(code)) {
            setError("Enter the 6-digit code from your email.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingEmail, code }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Verification failed.");
            }

            if (data.token) localStorage.setItem("token", data.token);
            if (data.user) localStorage.setItem("novagpt_user", JSON.stringify(data.user));

            setSuccessMessage("Email verified! Entering workspace...");
            setTimeout(() => setIsAuthenticated(true), 800);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendIn > 0) return;
        setError("");
        setSuccessMessage("");
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingEmail }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not resend the code.");
            setDevCode(data.devCode || "");
            setSuccessMessage("A new code is on its way. Check your inbox and spam folder.");
            setResendIn(30);
        } catch (err) {
            setError(err.message);
        }
    };

    const backToDetails = () => {
        setStep("details");
        setCode("");
        setError("");
        setSuccessMessage("");
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    return (
        <AuthLayout>
            <div className="authCard">
                <div className="authHeader">
                    <h2 className="authTitle">{step === "verify" ? "Verify your email" : "Create account"}</h2>
                    <p className="authSubtitle">
                        {step === "verify"
                            ? <>We sent a 6-digit code to <strong className="authEmailStrong">{pendingEmail}</strong>. Enter it below to finish creating your account.</>
                            : "Create your account to unlock intelligent conversational workflows and project acceleration."}
                    </p>
                </div>

                {error && (
                    <div className="authAlertError">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{error}</span>
                    </div>
                )}

                {successMessage && (
                    <div className="authAlertSuccess">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{successMessage}</span>
                    </div>
                )}

                {step === "verify" ? (
                    <form onSubmit={handleVerify} className="authForm">
                        <div className="inputGroup">
                            <label className="inputLabel">Verification code</label>
                            <div className="inputWrapper">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="otpInput"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        {devCode && (
                            <div className="authAlertSuccess">
                                <i className="fa-solid fa-flask"></i>
                                <span>Dev mode: your code is <strong>{devCode}</strong></span>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading || code.length !== 6} className="brandPrimaryBtn">
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <span>Verify &amp; Continue</span>
                            )}
                        </button>

                        <div className="otpActions">
                            <button type="button" className="otpLinkBtn" onClick={handleResend} disabled={resendIn > 0}>
                                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                            </button>
                            <button type="button" className="otpLinkBtn" onClick={backToDetails}>
                                Use a different email
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                <form onSubmit={handleRegister} className="authForm">
                    <div className="inputGroup">
                        <label className="inputLabel">Full name</label>
                        <div className="inputWrapper">
                            <input
                                type="text"
                                placeholder="Alex Morgan"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="inputLabel">Email address</label>
                        <div className="inputWrapper">
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="inputLabel">Password</label>
                        <div className="inputWrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Minimum 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                style={{ paddingRight: "42px" }}
                            />
                            <span 
                                className="inputIcon"
                                onClick={() => setShowPassword(!showPassword)} 
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <i className="fa-regular fa-eye-slash"></i>
                                ) : (
                                    <i className="fa-regular fa-eye"></i>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="inputGroup">
                        <label className="inputLabel">Confirm password</label>
                        <div className="inputWrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Repeat password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                style={{ paddingRight: "42px" }}
                            />
                            <span 
                                className="inputIcon"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                                title={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? (
                                    <i className="fa-regular fa-eye-slash"></i>
                                ) : (
                                    <i className="fa-regular fa-eye"></i>
                                )}
                            </span>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="brandPrimaryBtn"
                    >
                        {isLoading ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <span>Get Started</span>
                        )}
                    </button>
                </form>

                <div className="authDivider">
                    <span>OR SIGN UP WITH</span>
                </div>

                <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    className="socialBtn"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.18 21.31 7.24 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.19C.43 8.15 0 9.89 0 12s.43 3.85 1.19 5.4l4.08-3.16z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.24 0 3.18 2.69 1.19 6.6l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </svg>
                    Continue with Google
                </button>

                    </>
                )}

                <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "13px", color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <span onClick={onSwitchToSignIn} className="brandLink">
                        Sign In
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}