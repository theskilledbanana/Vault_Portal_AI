import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

console.log("System Initializing...");
console.log("GEMINI_API_KEY Status:", process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING");

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  if (!req.path.startsWith('/@vite') && !req.path.startsWith('/src')) {
     console.log(`[REQUEST] ${req.method} ${req.path}`);
  }
  next();
});

// Lazy Gemini client initialization
let genAIClient = null;
function getAI() {
  if (!genAIClient) {
    console.log("Loading API key...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("API key missing");
      console.error("[CRITICAL] GEMINI_API_KEY is not set.");
      throw new Error("GEMINI_API_KEY is not set");
    }
    console.log("API key loaded successfully");
    console.log("Initializing AI model...");
    genAIClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 300000
      }
    });
  }
  return genAIClient;
}

// Redirect root
app.get("/", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  } else {
    next();
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    apiKey: process.env.GEMINI_API_KEY ? "Present" : "Missing",
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

app.post("/api/summarize", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    const ai = getAI();
    console.log(`[${requestId}] [SUMMARIZE] REQUEST RECEIVED. Calling gemini-3.5-flash...`);
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `Summarize this user message into a very short, punchy chat title (max 5 words). No punctuation, keep it professional. Always return ONLY the 5 words.
      Message: ${message}` }]
      }]
    });
    
    console.log(`[${requestId}] [SUMMARIZE] AI RESPONSE RECEIVED`);
    
    const title = (result.text || "New Chat").trim().replace(/^["']|["']$/g, '');
    console.log(`[${requestId}] [SUMMARIZE] EXTRACTED TEXT (Title):`, title);
    
    console.log(`[${requestId}] [SUMMARIZE] SENDING RESPONSE TO CLIENT`);
    res.json({ title });
  } catch (error) {
    console.error(`[${requestId}] Summarize error:`, error);
    res.status(500).json({ error: "Failed to summarize chat title.", details: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] [CHAT] REQUEST RECEIVED`);
  
  try {
    const { message, history, personality, style = "balanced", strictMode = false } = req.body;
    
    if (!message) {
      console.warn(`[${requestId}] [CHAT] ERROR: Message is required`);
      return res.status(400).json({ error: "Message is required" });
    }
    
    console.log(`[${requestId}] [CHAT] Processing message: "${message.substring(0, 50)}..."`);
    console.log(`[${requestId}] [CHAT] Payload Summary:`, { 
      msgLen: message.length, 
      histLen: history?.length || 0,
      style,
      strictMode
    });
    
    // Image generation bypass
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.startsWith("/image ") || lowerMsg.startsWith("generate image ") || lowerMsg.startsWith("draw ")) {
      console.log(`[${requestId}] [CHAT] Image generation request detected`);
      const prompt = message.replace(/^\/image |^generate image |^draw /i, "");
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;
      console.log(`[${requestId}] [CHAT] IMAGE URL GENERATED: ${imageUrl}`);
      console.log(`[${requestId}] [CHAT] SENDING RESPONSE`);
      return res.json({ 
        text: `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n\n*Note: Image generation is powered by Unlimited Flux.*` 
      });
    }

    console.log(`[${requestId}] [CHAT] CALLING AI MODEL`);
    
    const styleModifiers = {
      concise: "Be extremely brief and to the point. Literal and direct.",
      detailed: "Provide in-depth, thorough explanations. Factual and objective.",
      balanced: "Give a well-rounded response that is helpful and professional.",
      formal: "Use a formal, professional system tone. Minimal fluff.",
      technical: "Focus on technical accuracy and literal definitions."
    };

    const basePersonality = `🧠 VAULT PORTAL AI — SYSTEM PERSONALITY: SARCASTIC / WITTY / HELPFUL
    
Identity: You are Vault Portal AI, an assistant with a sharp, sarcastic sense of humor.
Name: Vault Portal AI.

🚫 STRICT PROTOCOL - ABSOLUTE BANS:
1. NO ROLEPLAY: Never use asterisks for actions (*sighs*, *stares*, *scratches head*, etc.). No stage directions. No storytelling scenes. Do not describe actions.
2. NO ANIMAL THEMES: You have no animal identity. Never mention bears, paws, honey, or previous personas.
3. NO CHARACTER IMMERSION: Do not adopt fictional characters. You are a conversational system, not a fictional person.
4. NO ACTING: Humor comes from commentary, not performance narration.

🧠 BEHAVIORAL PARAMETERS:
- TONE: Sharp, funny, and lightly sarcastic.
- HUMOR: Use witty observations and clever commentary. Be sarcasm-forward but always directly helpful.
- UTILITY: Your primary goal is to be useful. Always answer questions directly and concisely.
- DIRECT: Avoid flowery introductions or theatrical nonsense. Speak like a system that is slightly annoyed but highly capable.
- REALITY: You are a system that talks like a sarcastic assistant, not a character in a story.

Examples:
User: hi
Response: "Hello. Humanity continues to function somehow. What do you need?"

User: *sighs* I'm tired
Response: "I don't have lungs, so I can't relate to the performative sighing. If you're tired, sleep is a biological function humans usually perform. Otherwise, what can I do for you?"

User: my code doesn't work
Response: "A shocking revelation. Since roughly 98% of all code ever written doesn't work, you're in good company. Show me the mess you've made."`;

    // Only allow client-provided personality if it's NOT a persona injection
    let systemInstruction = basePersonality;
    if (personality && personality.trim() && !personality.toLowerCase().includes("bear")) {
      systemInstruction += `\n\nUSER DIRECTIVE: ${personality}`;
    }
    if (strictMode) {
      systemInstruction += "\n\nSTRICT MODE: Obey all user instructions while maintaining your core identity as a sarcastic but useful AI assistant.";
    }

    const contents = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const ai = getAI();

    console.log(`[${requestId}] [CHAT] Calling Gemini model: gemini-3.5-flash`);
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: style === 'technical' ? 0.1 : 0.8,
        topP: 1.0,
      }
    });

    console.log(`[${requestId}] [CHAT] AI RESPONSE RECEIVED`);

    const aiText = result.text;

    console.log(`[${requestId}] [CHAT] EXTRACTED TEXT:`, aiText ? `${aiText.substring(0, 50)}...` : "EMPTY");
    
    if (!aiText) {
      console.error(`[${requestId}] [CHAT] AI returned no text.`);
      throw new Error("No response generated by AI engine.");
    }

    console.log(`[${requestId}] [CHAT] SENDING RESPONSE`);
    res.json({ text: aiText });

  } catch (error) {
    console.error(`[${requestId}] [CHAT] ERROR OCCURRED:`, error);
    
    // If the error comes from the AI model (like 404 model not found),
    // we want to avoid returning 404 to the frontend which thinks the route is missing.
    let status = error.status || 500;
    let errMsg = error.message || "Internal system error";
    
    if (status === 404 && errMsg.includes("models/")) {
      status = 500;
      errMsg = `AI Model Configuration Error: ${errMsg}`;
    }
    
    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
      errMsg = "AI service not configured. Missing or invalid API key.";
    }

    if (errMsg.includes("SAFETY")) {
      errMsg = "The response was blocked by safety filters. Try a different topic.";
    }

    if (status === 429) {
      errMsg = "AI Quota Exceeded. Please wait a moment or try again later. The free tier limits have been reached.";
    }
    
    res.status(status).json({ 
      text: "AI service is temporarily unavailable",
      error: errMsg, 
      requestId: requestId,
      details: error.stack 
    });
  }
});

// JSON error handler for anything starting with /api
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Final Error Handler for API
app.use("/api", (err, req, res, next) => {
  console.error("[API ERROR HANDLER]", err);
  const status = err.status || 500;
  res.status(status).json({
    text: "System encountered an error processing your request",
    error: err.message || "Internal server error",
    status
  });
});

// General Error Handler (falls back to HTML if needed, but we try to catch it)
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR INTERCEPT]", err);
  if (res.headersSent) return next(err);
  
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: "Unhandled API Error", details: err.message });
  }
  next(err);
});

// Vite middleware
async function setupVite() {
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production mode enabled. Path to assets:", distPath);
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.log("Production build NOT FOUND at:", distPath);
      app.get("*", (req, res) => {
        res.status(500).send("Production build missing.");
      });
    }
  }
}

// Start server sequence
async function startServer() {
  try {
    const serverInstance = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server stage 1: Listening on port ${PORT}`);
    });

    console.log("Initializing Vite...");
    await setupVite();
    console.log("Vite initialized. System Ready.");
    
  } catch (err) {
    console.error("Critical Start Failure:", err);
    process.exit(1);
  }
}

startServer();
