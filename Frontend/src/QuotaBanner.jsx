import React, { useState, useEffect } from "react";
import "./QuotaBanner.css";

export default function QuotaBanner({ quota }) {
    const [waitText, setWaitText] = useState("");

    useEffect(() => {
        if (!quota?.resetTime) return;

        const updateWaitTime = () => {
            const now = Date.now();
            const target = new Date(quota.resetTime).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setWaitText("a few moments");
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.ceil((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) {
                setWaitText(`${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`);
            } else {
                setWaitText(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
            }
        };

        updateWaitTime();
        const interval = setInterval(updateWaitTime, 1000);
        return () => clearInterval(interval);
    }, [quota?.resetTime]);

    if (!quota) return null;
    const isExceeded = (quota.remaining <= 0 || quota.messageCount >= 20) && quota.plan !== "pro";

    if (!isExceeded) return null;

    return (
        <div className="quotaBanner">
            <div className="quotaBannerContent">
                <div className="quotaBannerIcon">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div className="quotaBannerText">
                    <span className="quotaBannerTitle">
                        You've reached your limit of 20 prompts. Please wait {waitText || "a short while"} until your quota resets.
                    </span>
                </div>
            </div>
        </div>
    );
}
