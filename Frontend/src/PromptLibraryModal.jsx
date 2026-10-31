import React, { useState } from "react";
import "./PromptLibraryModal.css";

export const PROMPT_TEMPLATES = [
    {
        id: "refactor",
        category: "Coding",
        icon: "fa-solid fa-code-merge",
        title: "Code Refactoring Assistant",
        description: "Analyze code for clean architecture, eliminate redundant logic, improve readability, and optimize runtime performance.",
        promptText: "Please act as an expert software architect. Review this code for clean architecture, eliminate redundant logic, improve variable naming, and optimize performance. Provide the refactored code with clear explanations:\n\n```javascript\n// Paste your code here\nfunction calculateMetrics(items) {\n    let result = [];\n    for (let i = 0; i < items.length; i++) {\n        if (items[i].active == true) {\n            result.push({ id: items[i].id, val: items[i].val * 2 });\n        }\n    }\n    return result;\n}\n```"
    },
    {
        id: "bug_hunter",
        category: "Coding",
        icon: "fa-solid fa-bug",
        title: "Bug Hunter & Root Cause Analysis",
        description: "Pinpoint tricky edge cases, memory leaks, concurrency race conditions, and unhandled exception paths.",
        promptText: "Please act as a senior debugging engineer. Analyze this snippet for subtle logical bugs, memory leaks, race conditions, and unhandled edge cases. Explain the root cause of the bug and provide the corrected code:\n\n```javascript\n// Paste the buggy snippet here\nasync function syncUserData(userId) {\n    const user = await db.findUser(userId);\n    setTimeout(async () => {\n        await db.updateLastSeen(user.id);\n    }, 1000);\n    return user;\n}\n```"
    },
    {
        id: "sql_optimizer",
        category: "Database",
        icon: "fa-solid fa-database",
        title: "SQL Query Optimizer",
        description: "Analyze slow relational queries, recommend optimal indexing strategies, and eliminate costly table scans.",
        promptText: "Please act as a Database Performance Tuning Specialist. Analyze this slow SQL query and schema for performance bottlenecks. Suggest optimal compound indexes, rewrite the query to minimize full table scans, and explain execution plan improvements:\n\n```sql\nSELECT u.id, u.email, COUNT(o.id) as order_count, SUM(o.total) as total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE o.status = 'COMPLETED' AND o.created_at >= '2026-01-01'\nGROUP BY u.id, u.email\nORDER BY total_spent DESC\nLIMIT 20;\n```"
    },
    {
        id: "tech_blog",
        category: "Writing",
        icon: "fa-solid fa-pen-nib",
        title: "Technical Blog Writer",
        description: "Craft an engaging, developer-focused technical blog post with clear architecture breakdowns, code examples, and best practices.",
        promptText: "Please act as a Staff Developer Advocate and technical writer. Write an in-depth, engaging blog post about: 'Building Scalable Real-Time Microservices with Node.js and MongoDB'. Include real-world problem context, architecture diagram description, code examples, best practices, and a concluding summary."
    },
    {
        id: "api_architect",
        category: "Architecture",
        icon: "fa-solid fa-network-wired",
        title: "REST API Architect",
        description: "Design comprehensive production-ready RESTful or GraphQL schemas with error models and HTTP status standards.",
        promptText: "Please act as a Principal API Architect. Design a production-grade RESTful API specification for a SaaS Subscription and User Quota Billing service. Include endpoint URLs, HTTP methods, headers, request bodies, sample responses, error codes, and validation rules."
    },
    {
        id: "unit_tester",
        category: "Coding",
        icon: "fa-solid fa-vial-circle-check",
        title: "Unit Test Generator",
        description: "Generate comprehensive Vitest / Jest test suites covering happy paths, edge cases, and mocked dependencies.",
        promptText: "Please act as a QA Automation Specialist. Write a complete unit test suite using Vitest/Jest for this service function. Cover happy paths, boundary conditions, edge cases, error handling, and mock all database or external network calls:\n\n```javascript\nexport async function transferBalance(senderId, receiverId, amount) {\n    if (amount <= 0) throw new Error('Invalid amount');\n    const sender = await getAccount(senderId);\n    if (sender.balance < amount) throw new Error('Insufficient funds');\n    await deduct(senderId, amount);\n    await credit(receiverId, amount);\n    return { success: true };\n}\n```"
    },
    {
        id: "arch_explainer",
        category: "Architecture",
        icon: "fa-solid fa-sitemap",
        title: "System Architecture Explainer",
        description: "Break down complex distributed systems concepts, consensus protocols, or caching layers with crystal-clear analogies.",
        promptText: "Please act as a distributed systems professor. Explain how Raft consensus algorithm and write-ahead logs work under the hood. Use clear analogies, ASCII/Mermaid flow diagrams, and explain how network partitions and leader elections are safely handled."
    },
    {
        id: "regex_wizard",
        category: "Coding",
        icon: "fa-solid fa-wand-magic",
        title: "Regex Wizard",
        description: "Formulate bulletproof regular expressions with step-by-step token explanations and validation test suites.",
        promptText: "Please act as a regex specialist. Write a clean, performant regular expression to validate robust enterprise email addresses (handling subdomains, plus-addressing, and modern TLDs). Provide a step-by-step breakdown of each token, followed by 5 positive and 5 negative test cases."
    }
];

export default function PromptLibraryModal({ isOpen, onClose, onSelectPrompt }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    if (!isOpen) return null;

    const categories = ["All", "Coding", "Database", "Writing", "Architecture"];

    const filteredPrompts = PROMPT_TEMPLATES.filter((p) => {
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        const matchesQuery = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const handleCardClick = (template) => {
        onSelectPrompt(template.promptText);
        onClose();
    };

    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="promptModalCard" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="promptModalHeader">
                    <div className="promptModalHeaderTitle">
                        <div className="promptModalHeaderIcon">
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <div>
                            <h2>Production Prompt Library</h2>
                            <p>Curated prompts engineered for developers, writers, and architects</p>
                        </div>
                    </div>
                    <button className="modalCloseBtn" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="promptToolbar">
                    <div className="promptSearchWrapper">
                        <i className="fa-solid fa-magnifying-glass promptSearchIcon"></i>
                        <input 
                            type="text" 
                            placeholder="Search templates (e.g. refactor, sql, bug, blog)..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="categoryChips">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`categoryChip ${selectedCategory === cat ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="promptGrid">
                    {filteredPrompts.map((tmpl) => (
                        <div 
                            key={tmpl.id} 
                            className="promptCard"
                            onClick={() => handleCardClick(tmpl)}
                        >
                            <div>
                                <div className="promptCardHeader">
                                    <div className="promptCardIcon">
                                        <i className={tmpl.icon}></i>
                                    </div>
                                    <div>
                                        <h4 className="promptCardTitle">{tmpl.title}</h4>
                                        <span className="promptCardCategory">{tmpl.category}</span>
                                    </div>
                                </div>
                                <p className="promptCardSnippet" style={{ marginTop: "10px" }}>
                                    {tmpl.description}
                                </p>
                            </div>

                            <div className="promptCardAction">
                                <span>Use Template & Run</span>
                                <i className="fa-solid fa-arrow-right"></i>
                            </div>
                        </div>
                    ))}

                    {filteredPrompts.length === 0 && (
                        <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 1rem", color: "#71717a" }}>
                            <i className="fa-solid fa-box-open" style={{ fontSize: "28px", marginBottom: "8px" }}></i>
                            <p>No prompt templates found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
