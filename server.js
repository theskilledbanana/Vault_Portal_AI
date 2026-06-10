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
    
    // Using gemini-3.5-flash as per the latest recommendations in the skill
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash", 
      input: message,
      system_instruction: personality || `You are '${botName}', an epic, witty, and slightly chaotic digital companion. You deliver sharp, clever responses with a side of sarcasm and bear-themed puns. You're helpfully unhinged—think 'Genius Grizzly with a keyboard'. Keep it fast, funny, and uniquely yours.`,
      generation_config: {
        temperature: 0.8,
        top_p: 0.9,
      },
      // Note: Interactions use previous_interaction_id for history, but for simple history mapping:
      // history: history || [] 
      // Actually, standard historical injection often works via system prompt or previous_interaction_id
    });

    res.json({ text: interaction.output_text });
  } catch (error) {
    console.error("Chat API error:", error);
    // Be more specific in the response if possible
    const status = error.status || 500;
    res.status(status).json({ 
      error: error.message || "Internal system error",
      details: error.status ? `Status: ${error.status}` : undefined
    });
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
