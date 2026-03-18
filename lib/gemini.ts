import { GoogleGenerativeAI } from "@google/generative-ai";

const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
];

export async function callGeminiJson(opts: {
  system: string;
  user: string;
  schemaName: string;
  input: object;
  model?: string;
}) {
  const primaryModel = opts.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");

  // Create a list of models to try, starting with the primary one
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
  
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[gemini] Attempting call with model: ${modelName}`);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: opts.system
      });

      const prompt = `${opts.user}

Input Data:
${JSON.stringify(opts.input, null, 2)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from markdown if present
      let cleanText = text;
      if (text.includes("```json")) {
        cleanText = text.split("```json")[1].split("```")[0].trim();
      } else if (text.includes("```")) {
        cleanText = text.split("```")[1].split("```")[0].trim();
      }

      const content = JSON.parse(cleanText);
      return { model: modelName, content };

    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      const isRetryable = status === 503 || status === 429 || err?.message?.includes("503") || err?.message?.includes("429");

      if (isRetryable) {
        console.warn(`[gemini] Model ${modelName} failed with ${status || 'retryable error'}. Rotating model...`);
        // Small delay before trying next model
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // If it's not a retryable error, or we've run out of models, throw
      console.error(`[gemini] Non-retryable error with model ${modelName}:`, err.message);
      break;
    }
  }

  // If we're here, all attempts failed
  console.error("[gemini] All models failed. Last error:", lastError?.message);
  
  if (lastError?.message?.includes("JSON")) {
    throw new Error("Gemini did not return valid JSON");
  }
  
  throw lastError || new Error("Gemini request failed after multiple attempts");
}
