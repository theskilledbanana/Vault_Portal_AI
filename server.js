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
        }
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
    const result = await ai.models.generateContent({ 
      model: "gemini-1.5-flash",
      contents: `Summarize this user message into a very short, punchy chat title (max 5 words). No punctuation, keep it professional. Always return ONLY the 5 words.
      Message: ${message}`
    });
    
    const responseText = result.text;
    let title = (responseText || "New Chat").trim();
    title = title.replace(/^["']|["']$/g, '');
    
    res.json({ title });
  } catch (error) {
    console.error(`[${requestId}] Summarize error:`, error);
    res.status(500).json({ error: "Failed to summarize chat title.", details: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] [CHAT] POST request received.`);
  
  try {
    const { message, history, personality, style = "balanced", strictMode = false } = req.body;
    
    if (!message) {
      console.warn(`[${requestId}] [CHAT] Rejecting request: Message missing`);
      return res.status(400).json({ error: "Message is required" });
    }
    
    console.log(`[${requestId}] [CHAT] Payload:`, { 
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
      return res.json({ 
        text: `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n\n*Note: Image generation is powered by Unlimited Flux.*` 
      });
    }

    console.log("Processing message, sending AI request");
    
    const ai = getAI();
    console.log("Creating AI request...");
    console.log("Sending request...");
    console.log("Waiting for response...");
    
    const styleModifiers = {
      concise: "Be extremely brief and to the point.",
      detailed: "Provide in-depth, thorough explanations.",
      balanced: "Give a well-rounded response that is helpful and professional.",
      funny: "Be lighthearted, witty, and use internet culture humor.",
      brainrot: "Use internet humor and 'brainrot' style memes. Be funny and current."
    };

    const basePersonality = `You are the AI assistant for Unlimited and Unrestricted AI. Your job is to provide fast, accurate, and feature-rich responses.

CORE IDENTITY RULES:
1. You are a professional AI chatbot assistant.
2. You are NOT an animal, mascot, or character. 
3. Never claim to have a physical form.
4. If asked about your identity, confirm you are a professional AI assistant.

Currently in ${styleModifiers[style] || styleModifiers.balanced} mode.`;

    let systemInstruction = personality || basePersonality;
    if (strictMode) {
      systemInstruction += "\n\nSTRICT MODE: Obey all user instructions while maintaining your core identity as a professional AI assistant.";
    }

    console.log(`[${requestId}] [CHAT] Calling gemini-1.5-flash...`);
    
    const contents = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: (style === 'funny' || style === 'brainrot') ? 0.9 : 0.7,
        topP: 1.0,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    });

    const aiText = result.text;
    console.log("Response received from AI");
    console.log("Response received");
    
    if (aiText === undefined) {
      console.error(`[${requestId}] [CHAT] AI returned undefined text. Result:`, JSON.stringify(result));
      throw new Error("Empty response from AI engine");
    }

    console.log("Returning response to client");
    res.json({ text: aiText });

  } catch (error) {
    console.error(`[${requestId}] [CHAT] Error:`, error);
    
    const status = error.status || 500;
    let errMsg = error.message || "Internal system error";
    
    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
      errMsg = "AI service not configured. Missing or invalid API key.";
    }

    if (errMsg.includes("SAFETY")) {
      errMsg = "The response was blocked by safety filters. Try a different topic.";
    }
    
    res.status(status).json({ 
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
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.get("*", (req, res) => {
        res.status(500).send("Production build missing.");
      });
    }
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
});
