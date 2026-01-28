/**
 * Extracts raw text from various message formats (Vercel SDK, Cloudflare, etc.)
 */
export function extractTextFromMessage(message: any): string {
  if (!message) return "";
  
  // Case A: Direct content string (Standard OpenAI/Core format)
  if (typeof message.content === "string") return message.content;
  
  // Case B: Parts array (Cloudflare UI Message format)
  if (Array.isArray(message.parts)) {
    return message.parts
      .map((part: any) => (part.type === "text" ? part.text : ""))
      .join("");
  }
  
  return "";
}

/**
 * Robustly parses JSON from LLM output, handling markdown code blocks
 */
export function parseAIJson(rawText: string): any {
  try {
    // Remove markdown code blocks (```json ... ```)
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("JSON Parsing Failed:", e);
    return null;
  }
}