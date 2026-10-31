import React, { useState, useEffect, useContext, useRef } from "react";
import { MyContext } from "./MyContext.jsx";
import { MODEL_OPTIONS, VALID_MODELS, DEFAULT_MODEL } from "./models.js";
import "./SettingsModal.css";
import { API_BASE_URL } from "./config.js";

export default function SettingsModal({ isOpen, onClose, prevChats }) {
    // App-wide settings: whatever is saved here is what ChatWindow sends as `model` in POST /api/chat
    const { settings: appSettings, setSettings: saveAppSettings } = useContext(MyContext);

    const [activeTab, setActiveTab] = useState("account"); // account, appearance, controls, data
    const [user, setUser] = useState({
        username: "User",
        email: "user@example.com"
    });

    // Draft copy edited in the modal; committed to the app on "Save Preferences"
    const [settings, setSettings] = useState(() => ({
        theme: appSettings?.theme || "dark",
        model: VALID_MODELS.includes(appSettings?.model) ? appSettings.model : DEFAULT_MODEL
    }));

    const [nameInput, setNameInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameStatus, setNameStatus] = useState(""); // "", "saving", "saved", "error"
    const nameInputRef = useRef(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const res = await fetch(`${API_BASE_URL}/api/user/me`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setNameInput(data.username || "");
                }
            } catch (err) {
                const localUser = localStorage.getItem("novagpt_user");
                if (localUser) {
                    const parsed = JSON.parse(localUser);
                    setUser(parsed);
                    setNameInput(parsed.username || "");
                }
            }
        };

        if (isOpen) {
            fetchUserData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveSettings = async () => {
        setIsSaving(true);
        // Apply instantly to the whole app (theme + model used by the next chat request)
        saveAppSettings({ ...appSettings, ...settings });

        const token = localStorage.getItem("token");
        if (token) {
            try {
                await fetch(`${API_BASE_URL}/api/user/settings`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username: nameInput,
                        preferences: { theme: settings.theme, modelPreference: settings.model }
                    })
                });
                setUser(prev => ({ ...prev, username: nameInput }));
                const localUser = localStorage.getItem("novagpt_user");
                if (localUser) {
                    const parsed = JSON.parse(localUser);
                    parsed.username = nameInput;
                    localStorage.setItem("novagpt_user", JSON.stringify(parsed));
                }
            } catch (err) {
                console.error("Failed to sync settings:", err);
            }
        }

        // Close immediately after brief spinner transition without green message
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 350);
    };

    // ---- Display name editing ----
    const startEditingName = () => {
        setIsEditingName(true);
        setNameStatus("");
        setTimeout(() => nameInputRef.current?.focus(), 0);
    };

    const cancelEditingName = () => {
        setNameInput(user.username || "");
        setIsEditingName(false);
        setNameStatus("");
    };

    const commitName = async () => {
        const clean = nameInput.trim();
        if (!clean) {
            setNameStatus("error");
            return;
        }
        if (clean === user.username) {
            setIsEditingName(false);
            return;
        }
        const token = localStorage.getItem("token");
        setNameStatus("saving");
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ username: clean })
            });
            if (!res.ok) throw new Error("save failed");
            setUser((prev) => ({ ...prev, username: clean }));
            setNameInput(clean);
            try {
                const local = JSON.parse(localStorage.getItem("novagpt_user") || "null");
                if (local) localStorage.setItem("novagpt_user", JSON.stringify({ ...local, username: clean }));
            } catch { /* ignore broken local copy */ }
            setIsEditingName(false);
            setNameStatus("saved");
            setTimeout(() => setNameStatus(""), 2000);
        } catch {
            setNameStatus("error");
        }
    };

    const handleNameKeyDown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); commitName(); }
        if (e.key === "Escape") { e.preventDefault(); cancelEditingName(); }
    };

    // ---- Chat export (.txt / .md) ----
    const hasChat = Array.isArray(prevChats) && prevChats.length > 0;
    const datestamp = new Date().toISOString().slice(0, 10);
    const speaker = (role) => (role === "user" ? (user.username || "You") : "NovaGPT");

    const downloadFile = (content, filename, mime) => {
        const blob = new Blob([content], { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleExportText = () => {
        const body = prevChats
            .map((m) => `${speaker(m.role)}:\n${m.content}`)
            .join("\n\n----------------------------------------\n\n");
        const header = `NovaGPT conversation\nExported: ${new Date().toLocaleString()}\n\n========================================\n\n`;
        downloadFile(header + body + "\n", `novagpt_chat_${datestamp}.txt`, "text/plain");
    };

    const handleExportMarkdown = () => {
        const body = prevChats
            .map((m) => `### ${m.role === "user" ? "🧑 " : "🤖 "}${speaker(m.role)}\n\n${m.content}`)
            .join("\n\n---\n\n");
        const header = `# NovaGPT conversation\n\n_Exported: ${new Date().toLocaleString()}_\n\n---\n\n`;
        downloadFile(header + body + "\n", `novagpt_chat_${datestamp}.md`, "text/markdown");
    };

    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="settingsModalCard" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modalHeader">
                    <div className="modalHeaderTitle">
                        <i className="fa-solid fa-gear" style={{ color: "var(--accent)" }}></i>
                        <span>Settings</span>
                    </div>
                    <button className="modalCloseBtn" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="settingsModalBody">
                    {/* Navigation Sidebar: ONLY Account, Appearance, Controls, Data & Privacy */}
                    <div className="settingsNav">
                        <button 
                            className={`settingsNavItem ${activeTab === "account" ? "active" : ""}`}
                            onClick={() => setActiveTab("account")}
                        >
                            <i className="fa-solid fa-user"></i> Account
                        </button>
                        <button 
                            className={`settingsNavItem ${activeTab === "appearance" ? "active" : ""}`}
                            onClick={() => setActiveTab("appearance")}
                        >
                            <i className="fa-solid fa-palette"></i> Appearance
                        </button>
                        <button 
                            className={`settingsNavItem ${activeTab === "controls" ? "active" : ""}`}
                            onClick={() => setActiveTab("controls")}
                        >
                            <i className="fa-solid fa-sliders"></i> Controls
                        </button>
                        <button 
                            className={`settingsNavItem ${activeTab === "data" ? "active" : ""}`}
                            onClick={() => setActiveTab("data")}
                        >
                            <i className="fa-solid fa-database"></i> Data & Privacy
                        </button>
                    </div>

                    {/* Content Panel - Left aligned across all tabs */}
                    <div className="settingsContent">
                        {/* Account Tab */}
                        {activeTab === "account" && (
                            <div className="tabPane">
                                <h3 className="settingsSectionTitle">Account Details</h3>
                                <div className="settingsField">
                                    <label>Display Name</label>
                                    <div className={`nameEditWrap ${isEditingName ? "editing" : ""}`}>
                                        <input
                                            ref={nameInputRef}
                                            type="text"
                                            value={nameInput}
                                            onChange={(e) => setNameInput(e.target.value)}
                                            onKeyDown={handleNameKeyDown}
                                            readOnly={!isEditingName}
                                            placeholder="Your name"
                                            maxLength={60}
                                        />
                                        {isEditingName ? (
                                            <div className="nameEditActions">
                                                <button type="button" className="nameEditBtn confirm" onClick={commitName} title="Save name" disabled={nameStatus === "saving"}>
                                                    <i className={nameStatus === "saving" ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-check"}></i>
                                                </button>
                                                <button type="button" className="nameEditBtn" onClick={cancelEditingName} title="Cancel">
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" className="nameEditBtn" onClick={startEditingName} title="Edit display name" aria-label="Edit display name">
                                                <i className="fa-solid fa-pen"></i>
                                            </button>
                                        )}
                                    </div>
                                    {nameStatus === "saved" && <span className="nameStatus ok">Name updated</span>}
                                    {nameStatus === "error" && <span className="nameStatus bad">Couldn't save the name. Enter a name and try again.</span>}
                                </div>
                                <div className="settingsField">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={user.email} 
                                        disabled 
                                    />
                                </div>
                            </div>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === "appearance" && (
                            <div className="tabPane">
                                <h3 className="settingsSectionTitle">Color Theme</h3>
                                <div className="settingsField">
                                    <label>Interface Theme</label>
                                    <select 
                                        value={settings.theme}
                                        onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                                    >
                                        <option value="dark">Slate Dark - Default</option>
                                        <option value="oled">OLED Pitch Black</option>
                                        <option value="midnight">Midnight Slate</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Controls Tab */}
                        {activeTab === "controls" && (
                            <div className="tabPane">
                                <h3 className="settingsSectionTitle">Model Selection</h3>
                                <div className="settingsField">
                                    <label>Default AI Inference Model</label>
                                    <select 
                                        value={settings.model} 
                                        onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                    >
                                        {MODEL_OPTIONS.map((m) => (
                                            <option key={m.id} value={m.id}>{m.id} ({m.label})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Data & Privacy Tab */}
                        {activeTab === "data" && (
                            <div className="tabPane">
                                <h3 className="settingsSectionTitle">Data & Privacy</h3>
                                <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "0 0 16px 0", textAlign: "left", lineHeight: "1.5" }}>
                                    Export your conversation history or manage stored local session data.
                                </p>
                                <div className="exportActions">
                                    <button className="btnSecondary exportBtn" onClick={handleExportText} disabled={!hasChat}>
                                        <i className="fa-solid fa-file-lines"></i> Export Chat as Text (.txt)
                                    </button>
                                    <button className="btnSecondary exportBtn" onClick={handleExportMarkdown} disabled={!hasChat}>
                                        <i className="fa-brands fa-markdown"></i> Export Chat as Markdown (.md)
                                    </button>
                                </div>
                                {!hasChat && (
                                    <p className="exportHint">Open or start a conversation first. The currently open chat is what gets exported.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="modalFooter">
                    <button className="btnSecondary" onClick={onClose} disabled={isSaving}>Close</button>
                    <button className="btnPrimary" onClick={handleSaveSettings} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <span>Save Preferences</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
