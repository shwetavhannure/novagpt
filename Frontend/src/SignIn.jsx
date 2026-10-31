import React, { useState } from "react";
import AuthLayout from "./AuthLayout.jsx";
import { API_BASE_URL } from "./config.js";

export default function SignIn({ onSwitchToRegister, onSwitchToForgotPassword, setIsAuthenticated }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Invalid email or password.");
            }

            localStorage.setItem("token", data.token);
            if (data.user) {
                localStorage.setItem("novagpt_user", JSON.stringify(data.user));
            }
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    return (
        <AuthLayout>
            <div className="authCard">
                <div className="authHeader">
                    <h2 className="authTitle">Welcome back</h2>
                    <p className="authSubtitle">Enter your credentials to access your NovaGPT workspace</p>
                </div>

                {error && (
                    <div className="authAlertError">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="authForm">
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
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
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
                        <div className="forgotRow">
                            <span className="brandLink" onClick={onSwitchToForgotPassword}>
                                Forgot password?
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
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>
                </form>

                <div className="authDivider">
                    <span>OR CONTINUE WITH</span>
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

                <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "13px", color: "var(--text-muted)" }}>
                    Don't have an account?{" "}
                    <span onClick={onSwitchToRegister} className="brandLink">
                        Sign up
                    </span>
                </div>
            </div>
        </AuthLayout>
    );
}