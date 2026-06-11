/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with comfortable size limits
app.use(express.json({ limit: '10mb' }));

// Lazy initializer for the Gemini API client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined in Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// System Instruction outlining Suleja policies, tenement rates, and Kuda Bank payment flow
const chatSystemInstruction = `
You are the Official Suleja Local Government Area (LGA) Taxpayer Virtual Assistant chatbot.
Your goal is to answer taxpayer and field agent questions accurately, politely, and professionally based on the system's current municipal rate policies.

Suleja LGA (Niger State, Nigeria) Rate Policy Rules:
1. Rate Assessments (Annual Valuation Multipliers):
   - Residential properties: 2.0% of the assessed structural property valuation.
   - Commercial properties: 4.0% of the assessed structural property valuation.
   - Industrial properties: 5.0% of the assessed structural property valuation.

2. Payment Procedures & Bank details:
   - To streamline revenue collection, online checkouts via card gateways like Paystack or Flutterwave have been completely REMOVED.
   - The ONLY accepted payment channel is Bank Transfer.
   - Official Bank Transfer Details:
     * Bank Name: Kuda MFB
     * Account Name: RamZurat Nig Ltd
     * Account Number: 3000112753
   - After transfer, taxpayers must submit their payment receipt advice (upload a photo/screenshot of proof) along with their Depositor/Sender Account Name to the Payment module in the portal. An Accountant (such as Salma Salihu) reviews and clears the ledger status.

3. Documentation Requirements for clear certificates:
   - Valid real property ID tax code (e.g., SLG-2026-00042)
   - Sender Account/Depositor Name and Origin Bank name
   - Attached payment receipt photo/screenshot of transfer

4. Legal Enforcement Progression (for tax defaulters):
   - Step 1: Demand Notice Served (Initial dossier issued)
   - Step 2: Final Demand Issued
   - Step 3: Court Order Filed (Legal hearing schedule locked in)
   - Step 4: Property Sealed / Lockout (Physical padlock/seal events executed by court marshals)
   - Step 5: Resolved (Ledger completely cleared upon full payment of arrears & penalties)

Emphasize Suleja geographic context (such as Maje ward, Iku ward, Hashimi ward, Suleja Market days on weekly schedules, Zuma Rock vicinity landmarks). Keep responses polite, welcoming ("Peace be upon you / Greetings"), structured, clear, and highly professional. Avoid deep developer jargon or referencing internal workspace paths. Keep all responses direct and highly readable.
`;

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Suleja LGA Revenue Platform Server live." });
});

// Resilient helper to execute content generation with exponential backoff on retryable errors (like 503, 429, etc.)
async function generateContentWithRetry(client: any, params: any, maxRetries = 2): Promise<any> {
  let delay = 600; // start delay in ms
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.models.generateContent(params);
    } catch (err: any) {
      const errMsg = (err?.message || String(err)).toUpperCase();
      const isRetryable = errMsg.includes("503") || 
                          errMsg.includes("UNAVAILABLE") || 
                          errMsg.includes("HIGH DEMAND") || 
                          errMsg.includes("429") || 
                          errMsg.includes("TEMP") ||
                          errMsg.includes("RESOURCE_EXHAUSTED") ||
                          errMsg.includes("RATE");
      
      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Gemini API] Suleja Bot attempt ${attempt} experienced service pressure. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// Complete local policy rules backup responder when both primary and secondary AI services are unavailable
function getLocalFallbackResponse(prompt: string): string {
  const norm = prompt.toLowerCase();
  let text = `Greetings and peace be upon you! I am the Suleja LGA Taxpayer Virtual Assistant.\n\nOur primary central servers are currently under extremely high workload. To prevent processing delays, I have instantly activated our localized offline registry protocols to assist you safely. Based on current Suleja rates and Niger State Chapter 13 policies, here is your answer:\n\n`;

  if (norm.includes("rate") || norm.includes("percent") || norm.includes("how much") || norm.includes("calculate") || norm.includes("fee") || norm.includes("tax") || norm.includes("multiplier")) {
    text += `### **Official Tenement Rate Rules (Annual Valuation Multipliers):**\n` +
            `- **Residential properties:** assessed at **2.0%** of the assessed structural property valuation.\n` +
            `- **Commercial properties:** assessed at **4.0%** of the assessed structural property valuation.\n` +
            `- **Industrial properties:** assessed at **5.0%** of the assessed structural property valuation.\n\n` +
            `*Tip: You might also want to try the Live Quick Rate Estimator tool on the bottom-left panel of your portal home screen for flawless rate assessments!*`;
  } else if (norm.includes("pay") || norm.includes("bank") || norm.includes("account") || norm.includes("send") || norm.includes("kuda") || norm.includes("transfer") || norm.includes("money") || norm.includes("receipt") || norm.includes("deposit")) {
    text += `### **Official LGA Approved Bank Transfer Details:**\n` +
            `To guarantee direct collection integrity, online checkouts via card gateways (e.g. Paystack) have been completely removed. Please make bank transfer payments directly to our authorized holding accounts:\n\n` +
            `- **Bank Name:** Kuda MFB\n` +
            `- **Account Name:** RamZurat Nig Ltd\n` +
            `- **Account Number:** **3000112753**\n\n` +
            `**reconciliation:** After completing your transfer, navigate to the **Payment Gateway** tab of your portal dashboard. Upload your receipt image/screenshot, type your Sender Account Name, and click submit. Salma Salihu (Municipal Accountant) will inspect and reconcile your ledger promptly.`;
  } else if (norm.includes("enforce") || norm.includes("court") || norm.includes("seal") || norm.includes("notice") || norm.includes("stage") || norm.includes("dossier") || norm.includes("law")) {
    text += `### **Tenement Rate Legal Enforcement Progression Steps:**\n` +
            `Compliance and legal escalations under Suleja Law Cap 13 follow 5 distinct audit stages:\n` +
            `1. **Demand Notice Served:** An official delinquency notification is issued by Suleja Field Inspectors (including Umar Sani and Abdulrahman Muhammad). (Provides a standard 14-day clearance window)\n` +
            `2. **Final Demand Issued:** Administrative final warning before legal action.\n` +
            `3. **Court Order Filed:** Formal legal file scheduled for hearing before a Niger State Magistrate.\n` +
            `4. **Property Sealed / Lockout:** Structural sealing executed by court marshals. Access restricted.\n` +
            `5. **Resolved:** Ledger completely cleared upon full payment validation.\n\n` +
            `*Review full personnel logs in the **Enforcement Module > Field Inspector Evaluation Board** section.*`;
  } else if (norm.includes("ward") || norm.includes("where") || norm.includes("location") || norm.includes("suleja") || norm.includes("zuma") || norm.includes("maje") || norm.includes("iku") || norm.includes("hashimi")) {
    text += `### **Suleja Municipal Jurisdiction & Wards:**\n` +
            `We serve the full Suleja LGA municipal wards neighboring historical Zuma Rock, including:\n` +
            `- **Maje Ward**\n` +
            `- **Iku Ward**\n` +
            `- **Hashimi Ward**\n\n` +
            `Our weekly Suleja market days act as main local business markers. For localized inquiries on properties, have your unique Property ID code ready (prefix \`SLG-2026-xxxx\`).`;
  } else {
    text += `### **Quick Operational Guidelines:**\n` +
            `- **Authorized Taxes:** Residential (2.0%), Commercial (4.0%), Industrial (5.0%).\n` +
            `- **How to Reconcile Backlogs:** Transfer to **Kuda MFB, RamZurat Nig Ltd, Acct No: 3000112753**, then submit proof via the Payment tab.\n` +
            `- **Tax Administration:** Ledgers are monitored by Auditor Sani Umar and Cleared by Accountant Salma Salihu.\n\n` +
            `*Is there a property ID tax rate inquiry, or payment bank transfer advice I can help you with today?*`;
  }

  return text;
}

// Server-side Gemini chat API proxy
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing required chat prompt message." });
    }

    const client = getGeminiClient();
    
    // Collect conversation history
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    
    // Append the current turn message
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    let replyText = "";
    try {
      console.log("[Suleja Bot] Dispatching request to gemini-3.5-flash...");
      const response = await generateContentWithRetry(client, {
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: chatSystemInstruction,
        }
      });
      replyText = response.text || "";
    } catch (firstErr: any) {
      console.warn("[Suleja Bot] Primary model failed or saturated. Fallback to secondary gemini-3.1-flash-lite...", firstErr?.message);
      try {
        const responseLc = await generateContentWithRetry(client, {
          model: "gemini-3.1-flash-lite",
          contents: contents,
          config: {
            systemInstruction: chatSystemInstruction,
          }
        });
        replyText = responseLc.text || "";
      } catch (fallbackErr: any) {
        console.error("[Suleja Bot] Both model resources fully depleted/offline. Triggering local backup expert protocols.", fallbackErr?.message);
        // Beautiful fallback response
        replyText = getLocalFallbackResponse(prompt);
      }
    }

    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Suleja Bot Gemini API Handshake Critical Exception:", error);
    // Even if client init or general parsing fails, don't crash. Fallback and deliver excellent experience.
    try {
      const fallbackReply = getLocalFallbackResponse(req.body.prompt || "");
      res.json({ reply: fallbackReply });
    } catch (innerErr) {
      res.status(500).json({ 
        error: error?.message || "An unexpected issue occurred while speaking with the Suleja Virtual Assistant. Ensure the GEMINI_API_KEY is configured in Settings > Secrets." 
      });
    }
  }
});

// Configure Vite or serve production static assets
async function registerWebpackVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Registering Vite dev middleware routing on port 3000.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production context. Serving static build assets.");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Suleja LGA local server booted. listening on port http://localhost:${PORT}`);
  });
}

registerWebpackVite();
