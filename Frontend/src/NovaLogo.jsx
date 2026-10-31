import React, { useId } from "react";

/**
 * NovaGPT brand mark: a circular blue badge with a white "nova" spark.
 * Pure SVG (no image file, no icon font) so it is crisp at any size and
 * identical in the sidebar, the sign-in / sign-up pages and the favicon.
 */
export default function NovaLogo({ size = 32, className = "", title = "NovaGPT" }) {
    const gid = useId().replace(/:/g, "");
    return (
        <svg
            className={`novaLogo ${className}`}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            role="img"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={`bg${gid}`} x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#5cb4ff" />
                    <stop offset="1" stopColor="#1d6fc2" />
                </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="31" fill={`url(#bg${gid})`} />
            <circle cx="32" cy="32" r="30.5" fill="none" stroke="rgba(255,255,255,0.25)" />
            {/* main four-point spark */}
            <path
                d="M32 12 C33.6 24 40 30.4 52 32 C40 33.6 33.6 40 32 52 C30.4 40 24 33.6 12 32 C24 30.4 30.4 24 32 12 Z"
                fill="#ffffff"
            />
            {/* small companion spark */}
            <path
                d="M46 11 C46.5 15 48 16.5 52 17 C48 17.5 46.5 19 46 23 C45.5 19 44 17.5 40 17 C44 16.5 45.5 15 46 11 Z"
                fill="#ffffff"
                opacity="0.9"
            />
        </svg>
    );
}
