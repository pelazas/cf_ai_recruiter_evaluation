import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import { 
  createUIMessageStream, 
  createUIMessageStreamResponse,
  convertToModelMessages,
  type StreamTextOnFinishCallback,
} from "ai";
import { extractTextFromMessage, parseAIJson } from "./helpers";

// State Definition
export interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
}

export class Chat extends AIChatAgent<Env, RecruiterState> {
  // 1. Init State
  async onInitialize() {
    const stored = await this.ctx.storage.get<RecruiterState>("recruiter_state");
    if (stored) this.setState(stored);
    else this.setState({ questions: [], currentQuestionIndex: -1 });
  }

  // 2. State Helper
  async saveRecruiterState(state: RecruiterState) {
    this.setState(state);
    await this.ctx.storage.put("recruiter_state", state);
  }

  // 3. Logic: Save Interview Data
  async setupInterview(jobDescription: string, questions: string[]) {
    await this.saveRecruiterState({
      ...this.state,
      jobDescription,
      questions,
      currentQuestionIndex: 0
    });
  }

  // 4. Main Chat Logic
  async onChatMessage(onFinish: StreamTextOnFinishCallback<any>, options?: { abortSignal?: AbortSignal }) {
    
    // We use the Native Binding (this.env.AI) directly.
    
    const currentState = this.state || { questions: [], currentQuestionIndex: -1 };
    
    // Use the helper from helpers.ts
    const lastUserMessage = this.messages[this.messages.length - 1];
    const lastUserText = extractTextFromMessage(lastUserMessage);
    
    const isSetupPhase = (currentState.questions?.length || 0) === 0;
    const looksLikeJD = isSetupPhase && lastUserText.length > 50;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          if (looksLikeJD) {
            // ============================================================
            // BYPASS MODE: NATIVE CLOUDFLARE BINDING
            // ============================================================
            
            writer.write({
              type: "text-delta",
              delta: "🔍 Analyzing Job Description...",
              id: "thinking"
            });

            // UPDATED PROMPT logic
            // @ts-ignore
            const response = await this.env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
              messages: [
                { 
                  role: "system", 
                  content: `You are an expert Technical Recruiter.
                  
                  OBJECTIVE: Extract interview questions from the Job Description.
                  
                  OUTPUT FORMAT: 
                  Return ONLY a raw JSON object. Do not include introductory text.
                  
                  JSON SCHEMA: 
                  { "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"] }
                  
                  QUESTION GENERATION RULES:
                  - **Quantity:** Exactly 5 questions (2 Technical, 3 Behavioral).
                  - **Difficulty:** Easy to Mid-level.
                  - **Time Limit:** Questions must be answerable in 30-60 seconds.
                  - **Content:**
                    - Ignore fluff (mission, location).
                    - Focus on specific tech stacks found in the JD.
                    - 3 Behavioral questions should focus on soft skills found in JD (e.g. ownership, hard work, communication).
                  - **Style:**
                    - "What is your experience with [Tech]?"
                    - "Explain the difference between [Concept A] and [Concept B]."` 
                },
                { role: "user", content: `Here is the JD: ${lastUserText}` }
              ]
            });

            const rawText = (response as any).response || "";
            console.log("[DEBUG] Raw AI JSON:", rawText);

            // Use helper to parse JSON safely
            const parsed = parseAIJson(rawText);
            let questions: string[] = [];

            if (parsed && Array.isArray(parsed.questions)) {
              questions = parsed.questions;
            } else {
              // Fallback if AI fails
              questions = [
                "Could you briefly describe your experience with the core technologies in this role?",
                "What is the most challenging bug you have fixed recently?",
                "Tell me about a time you took ownership of a project.",
                "How do you handle feedback on your code?",
                "Describe a situation where you had to communicate complex technical details to a non-technical person."
              ];
            }

            // Save State
            await this.setupInterview(lastUserText, questions);

            // Reply
            const formatted = questions.map((q, i) => `**${i+1}.** ${q}`).join("\n");
            writer.write({
              type: "text-delta",
              delta: `\n\nI have prepared 5 questions based on the JD:\n\n${formatted}\n\nReady to start?`,
              id: "response"
            });

          } else {
            // ============================================================
            // NORMAL CHAT MODE
            // ============================================================
            
            const history = await convertToModelMessages(this.messages);
            
            // @ts-ignore
            const response = await this.env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
              messages: [
                { role: "system", content: "You are a helpful Recruiter Assistant. Keep answers concise." },
                ...history
              ]
            });

            const reply = (response as any).response || "";
            
            writer.write({
               type: "text-delta",
               delta: reply,
               id: "chat-reply"
            });
          }

        } catch (err: any) {
          console.error("CRITICAL ERROR:", err);
          writer.write({
            type: "text-delta",
            delta: `\n\n[System Error]: ${err.message || "Unknown error"}`,
            id: "error-id"
          });
        }
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/transcribe" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) return new Response("No file", { status: 400 });
        const blob = await (file as File).arrayBuffer();
        const response = await env.AI.run("@cf/openai/whisper", { 
          audio: [...new Uint8Array(blob)] 
        });
        return Response.json(response);
      } catch (e: any) {
        return new Response(e.message, { status: 500 });
      }
    }

    if (url.pathname === "/check-open-ai-key") return Response.json({ success: true });

    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;