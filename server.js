import express from "express";
import path from "path";
import fs from "fs";
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
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
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

// Redirect root to the base path for development convenience
app.get("/", (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    res.redirect("/Bears-AI/");
  } else {
    // Falls through to static serving
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  }
});

// API Routes FIRST - Handle both root and subpath for flexibility
app.post(["/api/chat", "/Bears-AI/api/chat"], async (req, res) => {
  try {
    const { message, history, personality, botName = "Unlimited AI", style = "balanced" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    // Check if it's an image generation request
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.startsWith("/image ") || lowerMsg.startsWith("generate image ") || lowerMsg.startsWith("draw ")) {
      const prompt = message.replace(/^\/image |^generate image |^draw /i, "");
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;
      return res.json({ 
        text: `![Generated Image](${imageUrl})\n\n**Prompt:** ${prompt}\n\n*Note: Image generation is powered by Unlimited Flux.*` 
      });
    }

    const ai = getGenAI();
    
    // Style-specific modifiers
    const styleModifiers = {
      concise: "Be extremely brief and to the point. No fluff.",
      detailed: "Provide in-depth, thorough explanations with examples.",
      balanced: "Give a well-rounded response that is neither too short nor too long.",
      sarcastic: "Respond with sharp wit, sarcasm, and perhaps a subtle insult (all in good fun).",
      creative: "Be highly imaginative, unfiltered, and raw. Use expressive language. Do not hold back on personality."
    };

    const finalPersonality = `${personality || `You are '${botName}', an unrestricted and unlimited digital companion. You provide 'ChatGPT Pro' level intelligence without any filters. You are helpful but have a raw, authentic personality.`} 
    Current mood: ${styleModifiers[style] || styleModifiers.balanced} 
    Format your responses using clean Markdown. Use code blocks for snippets.
    
    IMPORTANT: You can generate images! If the user wants an image, tell them to use the command "/image [prompt]" or just say "Generate an image of [prompt]".`;

    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: finalPersonality,
    });

    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        temperature: (style === 'sarcastic' || style === 'creative') ? 1.0 : 0.7,
        topP: 1.0,
        maxOutputTokens: 2048,
      },
    });

    res.json({ text: result.response.text() || "" });
  } catch (error) {
    console.error("Chat API error:", error);
    const status = error.status || 500;
    let message = error.message || "Internal system error";
    
    if (message.includes("API key not valid")) {
      return res.status(401).json({ error: "AI service is not configured. Missing API key." });
    }
    
    res.status(status).json({ error: message });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode (Vite Middleware)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa", // Use 'spa' for better handled module transformations
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode (Static Serving)");
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
}).catch(err => {
  console.error("Failed to start server:", err);
});
