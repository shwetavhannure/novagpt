import React, { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { API_BASE_URL } from "./config.js";

export default function ForgotPassword({ onSwitchToSignIn }) {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [resetLink, setResetLink] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setResetLink("");
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, clientUrl: window.location.origin }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to process request");
            }

            setMessage("Password reset instructions have been generated.");
            if (data.resetLink) {
                setResetLink(data.resetLink);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="authCard">
                <div className="authHeader">
                    <h2 className="authTitle">Reset password</h2>
                    <p className="authSubtitle">Enter your registered email to receive a secure recovery link</p>
                </div>

                {error && (
                    <div className="authAlertError">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="authAlertSuccess">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{message}</span>
                    </div>
                )}

                {resetLink && (
                    <div style={{
                        background: "rgba(51, 156, 255, 0.1)",
                        border: "1px dashed rgba(51, 156, 255, 0.4)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        fontSize: "12px",
                        marginBottom: "1rem",
                        wordBreak: "break-all"
                    }}>
                        <p style={{ margin: "0 0 4px", color: "#339cff", fontWeight: 600 }}>Direct Reset Link (Dev Mode):</p>
                        <a href={resetLink} className="brandLink" style={{ fontSize: "11px" }}>{resetLink}</a>
                    </div>
                )}

                <form onSubmit={handleForgotPassword} className="authForm">
                    <div className="inputGroup">
                        <label className="inputLabel">Email address</label>
                        <div className="inputWrapper">
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="brandPrimaryBtn"
                    >
                        {loading ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>Generating link...</span>
                            </>
                        ) : (
                            <>
                                <span>Send Reset Link</span>
                                <i className="fa-solid fa-paper-plane"></i>
                            </>
                        )}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "13px", color: "var(--text-muted)" }}>
                    Remember your password?{" "}
                    <span onClick={onSwitchToSignIn} className="brandLink">
                        Back to Sign In
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}