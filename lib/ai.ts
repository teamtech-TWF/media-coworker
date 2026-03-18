import OpenAI from "openai";

function redact(obj: any) {
  const copy: any = {};
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase().includes("token") || k.toLowerCase().includes("key") || k.toLowerCase().includes("secret") || k.toLowerCase().includes("authorization")) {
      copy[k] = "***";
    } else {
      copy[k] = obj[k];
    }
  }
  return copy;
}

export async function callOpenAIJson(opts: {
  system: string;
  user: string;
  schemaName: string;
  input: object;
  model?: string;
}) {
  const model = opts.model ?? process.env.OPENAI_MODEL ?? "gpt-5.2";
  // do not log input payloads; only log metadata
  console.log("[ai] Calling OpenAI model", model, "schema", opts.schemaName);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
      { role: "user", content: JSON.stringify({ payload: opts.input }) },
    ],
    text: {
      format: { type: "json_object" },
    },
  });

  // The Responses API returns top-level output[0].content[0].text
  const msg = response.output?.[0];
  if (!msg) throw new Error("OpenAI returned empty response");

  // Try to extract JSON from the response
  let content: any = null;
  try {
    // If SDK parsed it, it may be in response.output[0].content
    const msgAny: any = msg;
    if (msgAny.content && msgAny.content.length > 0) {
      const c = msgAny.content.find((c: any) => c.type === "output_text" || c.type === "output" || c.type === "json");
      if (c && typeof c.text === "string") {
        content = JSON.parse(c.text);
      }
    }
  } catch (err) {
    // ignore
  }

  // fallback: try to parse response.output_text
  if (!content) {
    const txt = response.output_text ?? (Array.isArray(response.output) ? response.output.map((o: any) => o.text).join("\n") : undefined);
    if (txt) {
      try {
        content = JSON.parse(txt as string);
      } catch (err) {
        throw new Error("OpenAI did not return valid JSON");
      }
    }
  }

  if (!content) throw new Error("Failed to parse JSON from OpenAI response");

  return { model, content };
}
