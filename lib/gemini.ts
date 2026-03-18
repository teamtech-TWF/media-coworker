import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callGeminiJson(opts: {
  system: string;
  user: string;
  schemaName: string;
  input: object;
  model?: string;
}) {
  const modelName = opts.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");

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

  try {
    const content = JSON.parse(cleanText);
    return { model: modelName, content };
  } catch (err) {
    console.error("[gemini] Failed to parse JSON:", cleanText);
    throw new Error("Gemini did not return valid JSON");
  }
}
