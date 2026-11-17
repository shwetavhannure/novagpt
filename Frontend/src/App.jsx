import './App.css';
import Sidebar from './Sidebar.jsx';
import ChatWindow from './ChatWindow.jsx';
import SignIn from './SignIn.jsx';
import Register from './Register.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import { MyContext } from './MyContext.jsx';
import { useState, useEffect, useCallback } from 'react';
import { v1 as uuidv1 } from 'uuid';
import { API_BASE_URL } from './config.js';
import { VALID_MODELS, DEFAULT_MODEL } from './models.js';

const getTokenExpiration = (token) => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

function App() {
  const isResetPasswordRoute = window.location.pathname.startsWith("/reset-password/");

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get("token");
    const token = urlToken || localStorage.getItem("token");
    
    if (urlToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const expiresAt = token ? getTokenExpiration(token) : null;
    if (!expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("novagpt_user");
      return false;
    }

    if (urlToken) localStorage.setItem("token", urlToken);
    return true;
  });

  const [authView, setAuthView] = useState("signin"); // "signin", "register", or "forgot"
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Chat application states
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allThreads, setAllThreads] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);

  // Usage quota state (20 messages per rolling 24-hour block)
  const [quota, setQuota] = useState({
    messageCount: 0,
    limit: 20,
    remaining: 20,
    resetTime: null,
    plan: "free"
  });

  // Global Settings State (Active Groq Model: openai/gpt-oss-20b)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("novagpt_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!VALID_MODELS.includes(parsed.model)) {
          parsed.model = DEFAULT_MODEL;
        }
        return parsed;
      } catch (e) {}
    }
    return { 
      theme: "dark", 
      model: DEFAULT_MODEL
    };
  });

  // Fetch current user quota from backend
  const fetchQuota = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/user/quota`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (err) {
      console.warn("Could not fetch user quota:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchQuota();
    }
  }, [isAuthenticated, fetchQuota]);

  // Single source of truth for settings (theme + model).
  // Settings modal and the model dropdown both call this, so the model chosen anywhere
  // is the one sent in POST /api/chat.
  const handleSaveSettings = (newSettings) => {
    const safe = {
      ...newSettings,
      model: VALID_MODELS.includes(newSettings?.model) ? newSettings.model : DEFAULT_MODEL
    };
    setSettings(safe);
    localStorage.setItem("novagpt_settings", JSON.stringify(safe));
  };

  // Dedicated function to trigger the ChatGPT-style full-screen logout animation
  const triggerLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("novagpt_user");
      setIsAuthenticated(false);
      setIsLoggingOut(false);
      setAuthView("signin");
    }, 2000);
  };

  // JWT expiry is enforced by the API too; this timer also returns an open tab
  // to sign-in as soon as its seven-day session expires.
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const token = localStorage.getItem("token");
    const expiresAt = token ? getTokenExpiration(token) : null;
    if (!expiresAt || expiresAt <= Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("novagpt_user");
      setIsAuthenticated(false);
      setAuthView("signin");
      return undefined;
    }

    const timeout = setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("novagpt_user");
      setIsAuthenticated(false);
      setAuthView("signin");
    }, expiresAt - Date.now());

    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
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
    setSettings: handleSaveSettings,
    isAuthenticated,
    setIsAuthenticated: (val) => {
      if (!val) {
        triggerLogout();
      } else {
        setIsAuthenticated(true);
      }
    }
  };

  if (isResetPasswordRoute) {
    return <ResetPassword />;
  }

  // Render full-screen ChatGPT-style logout transition overlay
  if (isLoggingOut) {
    return (
      <div className="logoutOverlay">
        <div className="logoutContent">
          <div className="logoutTitleWave">Logging out of all accounts</div>
          <div className="logoutSubtitleWave">Please wait</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === "register") {
      return (
        <Register 
          onSwitchToSignIn={() => setAuthView("signin")} 
          setIsAuthenticated={setIsAuthenticated}
        />
      );
    }
    if (authView === "forgot") {
      return (
        <ForgotPassword 
          onSwitchToSignIn={() => setAuthView("signin")} 
        />
      );
    }
    return (
      <SignIn 
        onSwitchToRegister={() => setAuthView("register")} 
        onSwitchToForgotPassword={() => setAuthView("forgot")}
        setIsAuthenticated={setIsAuthenticated} 
      />
    );
  }

  return (
    <div className={`app theme-${settings.theme || "dark"}`}>
      <MyContext.Provider value={providerValues}>
        {isSidebarOpen && (
          <div className="sidebarBackdrop" onClick={() => setIsSidebarOpen(false)} />
        )}
        {isSidebarOpen && <Sidebar />}
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );
}

export default App;
