import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";
import QuotaBanner from "./QuotaBanner.jsx";
import SettingsModal from "./SettingsModal.jsx";
import UpgradeModal from "./UpgradeModal.jsx";
import PromptLibraryModal from "./PromptLibraryModal.jsx";
import { API_BASE_URL } from "./config.js";
import { MODEL_OPTIONS, DEFAULT_MODEL, VALID_MODELS } from "./models.js";

function ChatWindow() {
    const {
        prompt,
        setPrompt,
        setReply,
        currThreadId,
        setPrevChats,
        prevChats,
        setNewChat,
        setIsAuthenticated,
        loading,
        setLoading,
        allThreads,
        setAllThreads,
        isSidebarOpen,
        setIsSidebarOpen,
        quota,
        setQuota,
        fetchQuota,
        settings,
        setSettings
    } = useContext(MyContext);

    // Dropdowns & Modals
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
    const [error, setError] = useState("");

    const profileRef = useRef(null);
    const modelMenuRef = useRef(null);
    const textareaRef = useRef(null);

    // Current user info stored locally or fetched
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem("novagpt_user");
        return saved ? JSON.parse(saved) : { username: "Nova User", email: "user@novagpt.ai" };
    });

    // Auto-expand textarea vertically as user types
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 200)}px`;
        }
    }, [prompt]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
                setIsModelMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch initial quota and user details
    useEffect(() => {
        const loadInitialData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const userRes = await fetch(`${API_BASE_URL}/api/user/me`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setCurrentUser(userData);
                    localStorage.setItem("novagpt_user", JSON.stringify(userData));
                }

                if (fetchQuota) {
                    fetchQuota();
                }
            } catch (err) {
                console.warn("Could not load initial user info:", err);
            }
        };

        loadInitialData();
    }, []);

    const handleLogout = () => {
        setIsDropdownOpen(false);
        setIsAuthenticated(false);
    };

    const handleSelectModel = (modelName) => {
        if (setSettings) {
            setSettings({ ...settings, model: modelName });
        }
        setIsModelMenuOpen(false);
    };

    // The model currently selected (Settings or this dropdown), always one of the 3 valid IDs
    const activeModel = VALID_MODELS.includes(settings?.model) ? settings.model : DEFAULT_MODEL;

    const isQuotaExceeded = (quota?.remaining <= 0 || quota?.messageCount >= 20) && quota?.plan !== "pro";

    // Main send message handler
    const getReply = async (customPrompt) => {
        const messageToSend = typeof customPrompt === "string" ? customPrompt : prompt;
        if (loading) return;
        if (!messageToSend || !messageToSend.trim()) return;

        // Check quota block
        if (isQuotaExceeded) {
            setError(`You've reached your limit of 20 prompts. Please wait ${quota?.waitText || "a short while"} until your quota resets.`);
            return;
        }

        setError("");
        setLoading(true);
        setPrompt("");
        setReply(null);

        // Reset textarea height back to single line
        if (textareaRef.current) {
            textareaRef.current.style.height = "48px";
        }

        const token = localStorage.getItem("token");

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: messageToSend,
                    threadId: currThreadId,
                    model: activeModel
                })
            });

            if (response.status === 401 || response.status === 403) {
                handleLogout();
                return;
            }

            const res = await response.json();

            // Handle 429 Quota Exceeded from backend
            if (response.status === 429) {
                setError(res.message || "You've reached your limit of 20 prompts.");
                if (setQuota) {
                    setQuota(prev => ({
                        ...prev,
                        remaining: 0,
                        resetTime: res.resetTime || prev?.resetTime,
                        waitText: res.waitText || prev?.waitText,
                        messageCount: res.current || 20
                    }));
                }
                setPrompt(messageToSend);
                return;
            }

            if (response.ok) {
                setNewChat(false);
                setPrevChats(prev => [
                    ...prev,
                    { role: "user", content: messageToSend },
                    { role: "assistant", content: res.reply }
                ]);
                setReply(res.reply);

                if (res.quota && setQuota) {
                    setQuota(res.quota);
                }

                // Dynamic AI Thread Title update: update sidebar thread title immediately!
                if (res.threadTitle && setAllThreads) {
                    setAllThreads(prevThreads => {
                        const exists = prevThreads.some(t => t.threadId === currThreadId);
                        if (exists) {
                            return prevThreads.map(t => 
                                t.threadId === currThreadId ? { ...t, title: res.threadTitle } : t
                            );
                        } else {
                            return [{ threadId: currThreadId, title: res.threadTitle }, ...prevThreads];
                        }
                    });
                }
            } else {
                setError(res.error || res.message || "Something went wrong. Please try again.");
                setPrompt(messageToSend);
            }
        } catch (err) {
            console.error("Network error:", err);
            setError("Cannot reach the server. Check that the backend is running on port 5001.");
            setPrompt(messageToSend);
        } finally {
            setLoading(false);
        }
    };

    // Callback when a prompt from the Prompt Library is selected
    const handleSelectPromptTemplate = (templateText) => {
        setPrompt(templateText);
        setTimeout(() => {
            getReply(templateText);
        }, 100);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            getReply();
        }
    };

    return (
        <div className="chatWindow">
            {/* Top Navbar matching Reference Style */}
            <div className="navbar">
                <div className="navBrand" ref={modelMenuRef}>
                    {!isSidebarOpen && (
                        <button 
                            className="sidebarExpandBtn" 
                            onClick={() => setIsSidebarOpen(true)}
                            title="Show Sidebar"
                        >
                            <i className="fa-solid fa-bars"></i>
                        </button>
                    )}

                    {/* Chat Header: "NovaGPT" with dropdown sign */}
                    <div 
                        className="navBrandSelector" 
                        onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        title="Select Model"
                    >
                        <span className="navBrandTitle">NovaGPT</span>
                        <i className={`fa-solid fa-chevron-down navChevron ${isModelMenuOpen ? "open" : ""}`}></i>
                    </div>

                    {isModelMenuOpen && (
                        <div className="modelDropdownMenu">
                            <div className="modelDropdownHeader">AI Model</div>
                            {MODEL_OPTIONS.map((m) => (
                                <div
                                    key={m.id}
                                    className={`modelDropdownItem ${activeModel === m.id ? "selected" : ""}`}
                                    onClick={() => handleSelectModel(m.id)}
                                >
                                    <div className="modelItemText">
                                        <span className="modelItemName">{m.id}</span>
                                        <span className="modelItemDesc">{m.short}</span>
                                    </div>
                                    {activeModel === m.id && <i className="fa-solid fa-check"></i>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="navRightActions">
                    {/* Prompt Library Quick Trigger */}
                    <button 
                        className="navPromptLibBtn" 
                        onClick={() => setIsPromptLibraryOpen(true)}
                        title="Explore pre-built prompts for coding, debugging & writing"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        <span className="navPromptLibText">Prompt Library</span>
                    </button>

                    {/* Profile Dropdown Container */}
                    <div className="profileContainer" ref={profileRef} style={{ position: "relative" }}>
                        <div className="userIconDiv" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                            <div className="userIcon">
                                <i className="fa-solid fa-user"></i>
                            </div>
                        </div>

                        {isDropdownOpen && (
                            <div className="dropDown">
                                <div className="dropDownUserHeader">
                                    <div className="dropDownUserName">{currentUser.username || "User"}</div>
                                    <div className="dropDownUserEmail">{currentUser.email || "user@novagpt.ai"}</div>
                                </div>

                                <div 
                                    className="dropDownItem highlight"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsUpgradeOpen(true);
                                    }}
                                >
                                    <i className="fa-solid fa-cube"></i>
                                    <span>Workspace Access</span>
                                </div>

                                <div 
                                    className="dropDownItem"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsPromptLibraryOpen(true);
                                    }}
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    <span>Prompt Library</span>
                                </div>

                                <div 
                                    className="dropDownItem"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsSettingsOpen(true);
                                    }}
                                >
                                    <i className="fa-solid fa-gear"></i>
                                    <span>Settings</span>
                                </div>

                                <div className="dropDownDivider"></div>

                                <div className="dropDownItem danger" onClick={handleLogout}>
                                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                    <span>Log out</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Body & Messages */}
            <Chat onOpenPromptLibrary={() => setIsPromptLibraryOpen(true)} />

            {/* Scale Loader when thinking */}
            {loading && (
                <div className="windowLoader">
                    <ScaleLoader color="#339cff" height={18} width={3} radius={2} margin={2} />
                </div>
            )}

            {/* Bottom Chat Input Section */}
            <div className="chatInput">
                {/* 20-Prompt Session Limit Banner */}
                <QuotaBanner quota={quota} />

                {error && !isQuotaExceeded && (
                    <p className="inputError">
                        <i className="fa-solid fa-circle-exclamation"></i> {error}
                    </p>
                )}

                {/* Flexible auto-expanding textarea container */}
                <div className={`inputBoxContainer ${isQuotaExceeded ? "disabled" : ""}`}>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder="Ask NovaGPT anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isQuotaExceeded || loading}
                        className="flexibleTextarea"
                    />

                    {/* Paper Airplane Send Button Style */}
                    <button
                        className={`submitBtn ${prompt.trim() && !loading && !isQuotaExceeded ? "active" : ""}`}
                        onClick={() => getReply()}
                        disabled={!prompt.trim() || loading || isQuotaExceeded}
                        title="Send message (Enter)"
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </div>

                <p className="info">
                    NovaGPT can make mistakes. Verify important information. See Cookie Preferences.
                </p>
            </div>

            {/* Modals */}
            {/* Mounted only while open so it always starts from the currently active theme/model */}
            {isSettingsOpen && (
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    prevChats={prevChats}
                />
            )}

            <UpgradeModal
                isOpen={isUpgradeOpen}
                onClose={() => setIsUpgradeOpen(false)}
            />

            <PromptLibraryModal
                isOpen={isPromptLibraryOpen}
                onClose={() => setIsPromptLibraryOpen(false)}
                onSelectPrompt={handleSelectPromptTemplate}
            />
        </div>
    );
}

export default ChatWindow;
