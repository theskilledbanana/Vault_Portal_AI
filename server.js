import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini client initialization
let genAI = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, personality, botName = "Bear" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGenAI();
    
    const systemPrompt = personality || `You are '${botName}', a professional and helpful AI assistant. Always respond quickly and concisely.`;
    
    // Using gemini-1.5-flash for stability and speed
    const chat = ai.chats.create({
      model: "gemini-1.5-flash", 
      config: {
        systemInstruction: systemPrompt,
      },
      history: history || []
    });

    const result = await chat.sendMessage({ message });
    const responseText = result.text;

    res.json({ text: responseText });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
