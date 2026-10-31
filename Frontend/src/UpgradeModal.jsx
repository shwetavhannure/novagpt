import React from "react";
import "./UpgradeModal.css";

export default function UpgradeModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="workspaceAccessModalCard" onClick={(e) => e.stopPropagation()}>
                <div className="workspaceAccessHeader">
                    <div className="workspaceAccessIcon">
                        <i className="fa-solid fa-cube"></i>
                    </div>
                    <button className="modalCloseBtn" onClick={onClose} title="Close">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="workspaceAccessBody">
                    <h2 className="workspaceAccessTitle">NovaGPT Workspace Access</h2>
                    <p className="workspaceAccessMessage">
                        You are currently using the standard NovaGPT sandbox environment with full features enabled. No payment plan upgrades are required for this deployment.
                    </p>
                </div>

                <div className="workspaceAccessFooter">
                    <button className="workspaceAccessCloseBtn" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
