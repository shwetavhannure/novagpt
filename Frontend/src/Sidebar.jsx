import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import NovaLogo from "./NovaLogo.jsx";
import { API_BASE_URL } from "./config.js";

function Sidebar() {
    const {
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        reply,
        setReply,
        setCurrThreadId,
        setPrevChats,
        setIsAuthenticated,
        setIsSidebarOpen,
        quota
    } = useContext(MyContext);

    // On phones/tablets the sidebar is a drawer: close it after choosing something
    const closeDrawerOnMobile = () => {
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
    };

    const isUnlimited = quota?.plan === "pro" || quota?.plan === "enterprise";
    const used = Math.min(quota?.messageCount || 0, quota?.limit || 20);
    const limit = quota?.limit || 20;
    const usedPercent = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));

    const handleAuthError = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
    };

    const getAllThreads = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/thread`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const res = await response.json();

            if (Array.isArray(res)) {
                const filteredData = res.map(thread => ({
                    threadId: thread.threadId,
                    title: thread.title || "Conversation"
                }));
                setAllThreads(filteredData);
            } else {
                setAllThreads([]);
            }
        } catch (err) {
            console.error("Failed to fetch threads:", err);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, reply]);

    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
        closeDrawerOnMobile();
    };

    const changeThread = async (newThreadId) => {
        if (newThreadId === currThreadId) {
            closeDrawerOnMobile();
            return;
        }
        closeDrawerOnMobile();
        setCurrThreadId(newThreadId);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/thread/${newThreadId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            const res = await response.json();
            if (response.ok) {
                setPrevChats(res);
                setNewChat(false);
                setReply(null);
            } else {
                console.warn(res.error);
            }
        } catch (err) {
            console.error("Error loading thread:", err);
        }
    };

    const deleteThread = async (threadId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/api/thread/${threadId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthError();
                return;
            }

            if (response.ok) {
                setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));
                if (threadId === currThreadId) {
                    createNewChat();
                }
            }
        } catch (err) {
            console.error("Error deleting thread:", err);
        }
    };

    return (
        <aside className="sidebar">
            {/* Top Header: logo + collapse + new-chat icon inside one bordered box */}
            <div className="sidebarHeader">
                <div className="sidebarTopBar">
                    <div className="sidebarBrandLogo" onClick={createNewChat} title="NovaGPT">
                        <NovaLogo size={30} className="sidebarHeaderLogoImg" />
                    </div>
                    <div className="sidebarTopActions">
                        <button
                            className="newChatTopIconBtn"
                            onClick={() => setIsSidebarOpen(false)}
                            title="Close sidebar"
                        >
                            <i className="fa-solid fa-bars-staggered"></i>
                        </button>
                        <button
                            className="newChatTopIconBtn"
                            onClick={createNewChat}
                            title="New Chat"
                        >
                            <i className="fa-regular fa-pen-to-square"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Conversation Threads History */}
            <ul className="history">
                <div className="historySectionHeader">Recent Conversations</div>
                {Array.isArray(allThreads) && allThreads.length > 0 ? (
                    allThreads.map((thread) => (
                        <li 
                            key={thread.threadId}
                            onClick={() => changeThread(thread.threadId)}
                            className={thread.threadId === currThreadId ? "highlighted" : ""}
                            title={thread.title}
                        >
                            <i className="fa-regular fa-message threadIcon"></i>
                            <span className="threadTitleText">
                                {thread.title}
                            </span>
                            <i 
                                className="fa-solid fa-trash"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteThread(thread.threadId);
                                }}
                                title="Delete chat"
                            ></i>
                        </li>
                    ))
                ) : (
                    <li className="emptyHistory">
                        No conversations yet
                    </li>
                )}
            </ul>

            {/* Bottom Footer: prompt quota + credit line */}
            <div className="sidebarFooter">
                <div className="quotaBox" title="Prompts used in the current session block">
                    <div className="quotaBoxRow">
                        <span className="quotaBoxLabel">Prompt Quota</span>
                        <span className="quotaBoxValue">
                            {isUnlimited ? "Unlimited" : `${used} / ${limit}`}
                        </span>
                    </div>
                    {!isUnlimited && (
                        <div className="quotaBar">
                            <div
                                className={`quotaBarFill ${usedPercent >= 90 ? "high" : ""}`}
                                style={{ width: `${usedPercent}%` }}
                            />
                        </div>
                    )}
                </div>
                <p className="sign">Built with &hearts; by Shweta</p>
            </div>
        </aside>
    );
}

export default Sidebar;
