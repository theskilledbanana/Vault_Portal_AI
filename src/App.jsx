import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Send, User as UserIcon, Loader2, Trash2, Zap, LogOut,
  Settings, X, Save, Sparkles, Cpu, Cloud, Moon, Sun, 
  Copy, Check, Volume2, Mic, Palette, Info, MessageSquareCode,
  Terminal, Search, Share2, History, RotateCcw, BrainCircuit,
  MessageSquare, UserRound
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind class merging
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const THEMES = {
  midnight: { 
    name: "Midnight", 
    bg: "bg-[#050507]", 
    accent: "text-indigo-400", 
    border: "border-white/5", 
    card: "bg-[#0a0a0f]", 
    input: "bg-white/5",
    button: "bg-indigo-500 text-white"
  },
  obsidian: { 
    name: "Obsidian", 
    bg: "bg-black", 
    accent: "text-amber-500", 
    border: "border-amber-500/20", 
    card: "bg-[#080808]", 
    input: "bg-white/5",
    button: "bg-amber-500 text-black"
  },
  cyber: { 
    name: "Cyber", 
    bg: "bg-[#020202]", 
    accent: "text-fuchsia-500", 
    border: "border-fuchsia-500/30", 
    card: "bg-[#050505]", 
    input: "bg-fuchsia-500/5",
    button: "bg-fuchsia-600 text-white"
  },
  serene: { 
    name: "Serene", 
    bg: "bg-[#f8fafc]", 
    accent: "text-indigo-600", 
    border: "border-slate-200", 
    card: "bg-white", 
    input: "bg-slate-100",
    text: "text-slate-900",
    button: "bg-indigo-600 text-white",
    isLight: true
  }
};

const ICONS = {
  sparkle: { icon: <Sparkles size={24} />, label: "Spark" },
  cpu: { icon: <Cpu size={24} />, label: "Nexus" },
  zap: { icon: <Zap size={24} />, label: "Bolt" },
  brain: { icon: <BrainCircuit size={24} />, label: "Soul" },
  terminal: { icon: <Terminal size={24} />, label: "Code" }
};

const BOT_AVATAR = "https://img.freepik.com/premium-vector/vector-funny-bear-head-simple-minimalist-logoweb-app-profile-avatar-icon_1196144-802.jpg";

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || "");
  const [needsName, setNeedsName] = useState(!localStorage.getItem('user_name'));
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : {
      botName: "Bear",
      personality: "You are Bear, an epic, witty, and slightly chaotic digital companion. You deliver sharp, clever responses with a side of sarcasm and bear-themed puns. Keep it fast, funny, and uniquely yours.",
      theme: "midnight",
      icon: "sparkle"
    };
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      text: input.trim(),
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    setInput("");
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: history,
          personality: settings.personality,
          botName: settings.botName
        }),
      });

      if (!response.ok) throw new Error("Neural linkage interrupted.");

      const data = await response.json();

      const aiMessage = {
        role: "model",
        text: data.text,
        id: (Date.now() + 1).toString(),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "model",
        text: "My neural sensors are fuzzy. Could you repeat that?",
        id: (Date.now() + 1).toString(),
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (name) {
      setUserName(name);
      localStorage.setItem('user_name', name);
      setNeedsName(false);
    }
  };

  const clearChat = () => {
    if (confirm("Wipe all message history?")) {
      setMessages([]);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentTheme = THEMES[settings.theme] || THEMES.midnight;

  if (needsName) {
    return (
      <div className="h-screen bg-[#050507] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#0a0a0f] border border-white/5 p-10 rounded-[3rem] shadow-3xl text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="p-6 bg-indigo-500/20 rounded-full">
              <UserRound size={48} className="text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Welcome to Bear's AI</h1>
          <p className="text-slate-500 mb-8 text-sm font-medium">What shall we call you, traveler?</p>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input 
              name="name" 
              required 
              autoFocus
              placeholder="Your name" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 text-center" 
            />
            <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl uppercase italic">
              Begin Session
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-screen font-sans transition-colors duration-700", currentTheme.bg, currentTheme.isLight ? "text-slate-900" : "text-slate-100")}>
      {/* Header */}
      <header className={cn("flex items-center justify-between px-6 py-4 border-b backdrop-blur-3xl sticky top-0 z-50", currentTheme.card, currentTheme.border)}>
        <div className="flex items-center gap-3">
          <motion.img 
            whileHover={{ scale: 1.1 }}
            src={BOT_AVATAR} 
            className="w-10 h-10 rounded-xl shadow-lg border border-white/10"
            alt="Bot Avatar"
          />
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">{settings.botName}'s AI</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-40">Ready</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Settings size={20} className="opacity-50 hover:opacity-100" />
          </button>
          <button onClick={clearChat} className="p-2 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-colors">
            <Trash2 size={20} className="opacity-50 hover:opacity-100" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 space-y-6 max-w-4xl mx-auto w-full custom-scrollbar">
        {messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none select-none">
            <BrainCircuit size={120} />
            <p className="mt-4 font-black uppercase italic tracking-[0.3em]">Quantum Core Ready</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", msg.role === "user" ? "bg-white/5 border-white/10" : "bg-indigo-500 border-indigo-400")}>
                  {msg.role === "user" ? <UserIcon size={20} /> : <div className="p-1"><BrainCircuit size={20} className="text-white" /></div>}
                </div>
                <div className={cn(
                  "relative group max-w-[85%] px-5 py-4 rounded-2xl shadow-sm border",
                  msg.role === "user" 
                    ? "bg-white/5 border-white/10 text-white" 
                    : cn(currentTheme.card, currentTheme.border)
                )}>
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold opacity-30 uppercase">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={() => copyToClipboard(msg.text, msg.id)} className="p-1 hover:text-indigo-400 transition-colors">
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center animate-pulse">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
            <div className={cn("px-6 py-4 rounded-2xl border flex items-center gap-1", currentTheme.card, currentTheme.border)}>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          </motion.div>
        )}
      </main>

      {/* Input Surface */}
      <footer className="p-6 bg-transparent border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder={`Message ${settings.botName}...`}
              className={cn(
                "w-full rounded-[2rem] px-8 py-5 pr-16 text-lg font-medium outline-none transition-all shadow-inner",
                "bg-white/5 border border-white/10 text-white focus:border-indigo-500/50 focus:ring-8 focus:ring-indigo-500/5"
              )}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-white/5 disabled:text-white/20 text-white rounded-full transition-all shadow-lg active:scale-95"
            >
              {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            </button>
          </form>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSettings(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tight">Configuration</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">AI Entity Name</label>
                  <input 
                    value={settings.botName}
                    onChange={(e) => setSettings({...settings, botName: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all font-bold" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Personality Matrix</label>
                  <textarea 
                    value={settings.personality}
                    onChange={(e) => setSettings({...settings, personality: e.target.value})}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-sm leading-relaxed" 
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Visual Skin</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(THEMES).map(([key, theme]) => (
                      <button 
                        key={key}
                        onClick={() => setSettings({...settings, theme: key})}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                          settings.theme === key ? "bg-indigo-500/10 border-indigo-500/50" : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg border", theme.bg, theme.border)} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-slate-100 transition-all uppercase italic shadow-lg"
                >
                  Apply System Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        
        .prose code { color: #818cf8 !important; background: rgba(129, 140, 248, 0.1) !important; padding: 2px 4px !important; border-radius: 4px !important; }
        .prose pre { background: rgba(0,0,0,0.3) !important; border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 12px !important; padding: 1rem !important; }
        .prose blockquote { border-left-color: #818cf8 !important; color: #94a3b8 !important; }
        .prose h1, .prose h2, .prose h3 { color: white !important; font-weight: 800 !important; }
      `}</style>
    </div>
  );
}
