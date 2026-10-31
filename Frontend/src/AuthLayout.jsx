import React from "react";
import "./AuthSplitScreen.css";
import NovaLogo from "./NovaLogo.jsx";

export default function AuthLayout({ children }) {
    return (
        <div className="authContainer">
            {/* Left Hero Graphic Showcase */}
            <div className="authHeroSide">
                <div className="heroBrand">
                    <NovaLogo size={40} className="heroBrandLogo" />
                    <span className="heroBrandText">NovaGPT</span>
                </div>

                <div className="heroContent">
                    <h1 className="heroHeading">
                        Next-Gen AI Conversations, <span>Effortlessly Fast</span>.
                    </h1>

                    <p className="heroDescription">
                        Experience ultra-responsive AI assistance with context-aware memory, production prompt engineering, and intelligent quota management.
                    </p>

                    <div className="heroFeatures">
                        <div className="featureCard">
                            <div className="featureIcon">
                                <i className="fa-solid fa-bolt"></i>
                            </div>
                            <div className="featureText">
                                <h4>Ultra-Fast Groq Inference</h4>
                                <p>Sub-second response streaming powered by next-gen LPU hardware.</p>
                            </div>
                        </div>

                        <div className="featureCard">
                            <div className="featureIcon">
                                <i className="fa-solid fa-layer-group"></i>
                            </div>
                            <div className="featureText">
                                <h4>Dynamic Thread Generation</h4>
                                <p>Smart contextual titles generated automatically from your first message.</p>
                            </div>
                        </div>

                        <div className="featureCard">
                            <div className="featureIcon">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                            </div>
                            <div className="featureText">
                                <h4>Curated Prompt Library</h4>
                                <p>One-click pre-built production templates for code review, debugging & SQL.</p>
                            </div>
                        </div>

                        <div className="featureCard">
                            <div className="featureIcon">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <div className="featureText">
                                <h4>Intelligent Quota Protection</h4>
                                <p>Generous 20 prompts per session block with automated reset protection.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="heroFooter">
                    <span>© 2026 NovaGPT • Built with &hearts; by Shweta</span>
                </div>
            </div>

            {/* Right Authentication Form Card */}
            <div className="authFormSide">
                <div className="authMobileBrand">
                    <NovaLogo size={32} />
                    <span>NovaGPT</span>
                </div>
                {children}
            </div>
        </div>
    );
}
