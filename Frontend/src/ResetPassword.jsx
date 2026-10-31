import React, { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { API_BASE_URL } from "./config.js";

export default function ResetPassword() {
    const pathParts = window.location.pathname.split("/");
    const token = pathParts[pathParts.length - 1];

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (password.length < 6) {
            return setError("Password must be at least 6 characters long.");
        }

        if (password !== confirmPassword) {
            return setError("Passwords do not match.");
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password.");
            }

            setSuccessMessage("Password reset successfully! Redirecting to login...");
            setTimeout(() => {
                window.location.href = "/";
            }, 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="authCard">
                <div className="authHeader">
                    <h2 className="authTitle">New password</h2>
                    <p className="authSubtitle">Create a strong, secure password for your account</p>
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

                <form onSubmit={handleResetSubmit} className="authForm">
                    <div className="inputGroup">
                        <label className="inputLabel">New Password</label>
                        <div className="inputWrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Minimum 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
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
                        <label className="inputLabel">Confirm Password</label>
                        <div className="inputWrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Repeat new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
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
                                <span>Updating Password...</span>
                            </>
                        ) : (
                            <>
                                <span>Save New Password</span>
                                <i className="fa-solid fa-check"></i>
                            </>
                        )}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "13px", color: "var(--text-muted)" }}>
                    <a href="/" className="brandLink">
                        Back to Sign In
                    </a>
                </div>
            </div>
        </AuthLayout>
    );
}