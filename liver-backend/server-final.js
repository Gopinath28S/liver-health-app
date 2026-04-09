require("dotenv").config({ path: "./.env" });
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

console.log("=================================");
console.log("Starting server...");
console.log("Node version:", process.version);
console.log("GROQ_API_KEY present:", !!process.env.GROQ_API_KEY);
console.log("=================================");

app.get("/test", (req, res) => {
  console.log("Test route hit");
  res.send("TEST OK");
});

app.post("/chat", async (req, res) => {
  console.log("\n=== NEW REQUEST ===");
  console.log("Message:", req.body.message);
  
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      console.log("No message provided");
      return res.json({ reply: "No message provided" });
    }

    if (!process.env.GROQ_API_KEY) {
      console.log("No API key found");
      return res.json({ reply: "API key not configured" });
    }

    console.log("Calling Groq API...");
    
    const requestBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI Liver Health Assistant. Provide clear, supportive health information."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log("Request body prepared");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log("Groq response status:", response.status);
    console.log("Groq response ok:", response.ok);
    
    const data = await response.json();
    console.log("Response data keys:", Object.keys(data));

    if (!response.ok) {
      console.error("Groq API Error Response:", JSON.stringify(data, null, 2));
      const errorMsg = data.error?.message || data.message || "Unknown API error";
      return res.json({ reply: `Groq API Error: ${errorMsg}` });
    }

    if (!data.choices || !data.choices[0]) {
      console.error("Invalid response structure:", JSON.stringify(data, null, 2));
      return res.json({ reply: "Invalid response from AI" });
    }

    const reply = data.choices[0].message.content;
    console.log("Reply length:", reply.length);
    console.log("Sending reply to client");
    
    res.json({ reply });

  } catch (error) {
    console.error("\n!!! SERVER ERROR !!!");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.json({ reply: "Server Error: " + error.message });
  }
  
  console.log("=== END REQUEST ===\n");
});

const PORT = 3001;
 
const multer = require("multer");
const fs = require("fs");
 
// Multer setup — stores uploads in memory (no disk clutter)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});
 
// -----------------------------------------------
// POST /analyze-image
// Body: multipart/form-data
//   - image: File (jpg/png/webp)
//   - type:  "jaundice" | "facial" | "palm"
// -----------------------------------------------
app.post("/analyze-image", upload.single("image"), async (req, res) => {
  console.log("\n=== IMAGE ANALYSIS REQUEST ===");
 
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }
 
    const analysisType = req.body.type || "jaundice";
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
 
    console.log("Analysis type:", analysisType);
    console.log("Image size:", req.file.size, "bytes");
    console.log("MIME type:", mimeType);
 
    // Build the analysis prompt based on type
    const prompts = {
      jaundice: `You are an AI medical screening assistant. Analyze this image for visual signs of jaundice.
 
Look for:
1. Yellow tint in the skin (icterus)
2. Yellow discoloration in visible eye whites (scleral icterus)
3. Overall skin pallor or unusual coloration
4. Any visible swelling or puffiness
 
Respond in this exact JSON format only (no markdown, no extra text):
{
  "detected": true or false,
  "confidence": "Low" | "Medium" | "High",
  "riskLevel": "None" | "Mild" | "Moderate" | "Severe",
  "findings": ["finding 1", "finding 2"],
  "recommendation": "brief actionable recommendation",
  "disclaimer": "This is a screening tool only. Consult a doctor for diagnosis."
}`,
 
      facial: `You are an AI medical screening assistant. Analyze this facial image for signs that may indicate liver or metabolic health concerns.
 
Look for:
1. Skin pallor or yellowish discoloration (jaundice)
2. Periorbital puffiness or dark under-eye circles
3. Skin texture changes (dryness, spider angiomas)
4. Overall complexion and facial coloration
5. Visible signs of fatigue or illness
 
Respond in this exact JSON format only (no markdown, no extra text):
{
  "detected": true or false,
  "confidence": "Low" | "Medium" | "High",
  "riskLevel": "None" | "Mild" | "Moderate" | "Severe",
  "findings": ["finding 1", "finding 2"],
  "recommendation": "brief actionable recommendation",
  "disclaimer": "This is a screening tool only. Consult a doctor for diagnosis."
}`,
 
      palm: `You are an AI medical screening assistant. Analyze this palm/hand image for signs of palmar erythema or other indicators that may suggest liver health concerns.
 
Look for:
1. Palmar erythema — reddening of the palm (especially thenar/hypothenar areas)
2. Liver spots or unusual pigmentation
3. Nail changes (Terry's nails, leukonychia)
4. Skin texture and color uniformity
5. Visible vascular changes
 
Respond in this exact JSON format only (no markdown, no extra text):
{
  "detected": true or false,
  "confidence": "Low" | "Medium" | "High",
  "riskLevel": "None" | "Mild" | "Moderate" | "Severe",
  "findings": ["finding 1", "finding 2"],
  "recommendation": "brief actionable recommendation",
  "disclaimer": "This is a screening tool only. Consult a doctor for diagnosis."
}`,
    };
 
    const systemPrompt = prompts[analysisType] || prompts.jaundice;
 
    // Call Groq API with vision model
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Groq vision model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: systemPrompt,
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
 
    console.log("Groq vision response status:", response.status);
 
    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq vision error:", errData);
      return res.status(500).json({
        error: "Vision API error: " + (errData.error?.message || "Unknown error"),
      });
    }
 
    const data = await response.json();
    const rawText = data.choices[0].message.content.trim();
    console.log("Raw vision response:", rawText);
 
    // Parse JSON — strip any accidental markdown fences
    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error("JSON parse error:", e.message);
      // Return a safe fallback
      parsed = {
        detected: false,
        confidence: "Low",
        riskLevel: "None",
        findings: ["Unable to parse AI response. Please try a clearer image."],
        recommendation: "Please upload a well-lit, clear image and try again.",
        disclaimer: "This is a screening tool only. Consult a doctor for diagnosis.",
      };
    }
 
    res.json({ result: parsed, analysisType });
  } catch (error) {
    console.error("Image analysis error:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
 
  console.log("=== END IMAGE ANALYSIS ===\n");
});

app.listen(PORT, () => {
  console.log(`\n✓ Server successfully started on port ${PORT}`);
  console.log(`✓ Test: http://localhost:${PORT}/test`);
  console.log(`✓ Chat: http://localhost:${PORT}/chat`);
  console.log("\nServer is ready and waiting for requests...\n");
}).on('error', (err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});