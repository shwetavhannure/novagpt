import "./Chat.css";
import React, { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; 
import remarkMath from "remark-math"; 
import rehypeRaw from "rehype-raw"; 
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; 
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { PROMPT_TEMPLATES } from "./PromptLibraryModal.jsx";

function Chat({ onOpenPromptLibrary }) {
    const { newChat, prevChats, reply, setPrompt } = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);
    const chatEndRef = useRef(null);

    // Auto-scroll helper
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Clean up raw LaTeX delimiters for KaTeX
    const formatContent = (content) => {
        if (!content) return "";
        return content
            .replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => `\n\n$$\n${p1.trim()}\n$$\n\n`)
            .replace(/\\\(([\s\S]*?)\\\)/g, (match, p1) => `$${p1.trim()}$`)
            .replace(/^\s*\\\s*$/gm, "");
    };

    // Typewriter effect for latest assistant reply
    useEffect(() => {
        if (reply === null) {
            setLatestReply(null); 
            return;
        }

        if (!prevChats?.length) return;

        const lastMessage = prevChats[prevChats.length - 1];
        const textToAnimate = lastMessage?.role === "assistant" ? lastMessage.content : reply;
        const words = textToAnimate.split(" "); 

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(words.slice(0, idx + 1).join(" "));
            idx++;
            scrollToBottom();
            if (idx >= words.length) clearInterval(interval);
        }, 25);

        return () => clearInterval(interval);
    }, [prevChats, reply]);

    useEffect(() => {
        scrollToBottom();
    }, [prevChats, latestReply]);

    // Handle clicking a starter suggestion chip
    const handleQuickSuggestion = (template) => {
        setPrompt(template.promptText);
    };

    const isChatEmpty = newChat || (!prevChats || prevChats.length === 0);

    return (
        <div className={`chats ${isChatEmpty ? "emptyChatsViewport" : ""}`}>
            {isChatEmpty && (
                <div className="newChatContainer">
                    <h1 className="newChatTitle">How can NovaGPT assist you today?</h1>
                    <p className="newChatSubtitle">
                        Ask any complex engineering question, refactor code, or pick a starter template from our production prompt library.
                    </p>

                    <div className="suggestionGrid">
                        {PROMPT_TEMPLATES.slice(0, 4).map((template) => (
                            <div 
                                key={template.id}
                                className="suggestionCard"
                                onClick={() => handleQuickSuggestion(template)}
                            >
                                <div className="suggestionTitle">
                                    <i className={template.icon}></i>
                                    <span>{template.title}</span>
                                </div>
                                <div className="suggestionDesc">
                                    {template.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Conversation Messages */}
            {!isChatEmpty && prevChats?.slice(0, -1).map((chat, idx) => (
                <div className={chat.role === "user" ? "userDiv" : "gptDiv"} key={idx}>
                    {chat.role === "user" ? (
                        <p className="userMessage">{chat.content}</p>
                    ) : (
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                        >
                            {formatContent(chat.content)}
                        </ReactMarkdown>
                    )}
                </div>
            ))}

            {!isChatEmpty && prevChats.length > 0 && (
                <>
                    {latestReply === null ? (
                        <div className="gptDiv" key="non-typing">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]} 
                                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                            >
                                {formatContent(prevChats[prevChats.length - 1].content)}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="gptDiv" key="typing">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]} 
                                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                            >
                                {formatContent(latestReply)}
                            </ReactMarkdown>
                        </div>
                    )}
                </>
            )}

            <div ref={chatEndRef} />
        </div>
    );
}

export default Chat;