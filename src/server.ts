import { AIChatAgent } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import { 
  createUIMessageStream, 
  createUIMessageStreamResponse,
  type StreamTextOnFinishCallback,
} from "ai";
import { extractTextFromMessage, parseAIJson } from "./helpers";

// State Definition
export interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
  responses?: Record<number, string>;
  scorecard?: string;
}

export class Chat extends AIChatAgent<Env, RecruiterState> {
  // 1. Init State
  async onInitialize() {
    const stored = await this.ctx.storage.get<RecruiterState>("recruiter_state");
    if (stored) this.setState(stored);
    else this.setState({ questions: [], currentQuestionIndex: -1, responses: {} });
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
      currentQuestionIndex: 0,
      responses: {}
    });
  }

  // 4. Logic: Clear Data (Reset)
  async clearInterview() {
    this.setState({ questions: [], currentQuestionIndex: -1, jobDescription: undefined, responses: {} });
    await this.ctx.storage.delete("recruiter_state");
  }

  /**
   * Generates technical questions based on a Job Description
   */
  private async handleJDAnalysis(lastUserText: string, writer: any) {
    writer.write({
      type: "text-delta",
      delta: "🔍 Analyzing Job Description...",
      id: "thinking"
    });

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

    const parsed = parseAIJson(rawText);
    let questions: string[] = [];

    if (parsed && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else {
      questions = [
        "Could you briefly describe your experience with the core technologies in this role?",
        "What is the most challenging bug you have fixed recently?",
        "Tell me about a time you took ownership of a project.",
        "How do you handle feedback on your code?",
        "Describe a situation where you had to communicate complex technical details to a non-technical person."
      ];
    }

    await this.setupInterview(lastUserText, questions);

    const formatted = questions.map((q, i) => `**${i+1}.** ${q}`).join("\n");
    writer.write({
      type: "text-delta",
      delta: `\n\nI have prepared 5 questions based on the JD:\n\n${formatted}\n\nReady to start?`,
      id: "response"
    });
  }

  /**
   * Handles regular chat messages
   */
  private async handleNormalChat(writer: any) {
    const history = this.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: extractTextFromMessage(m)
      }));
    
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

  /**
   * Generates a Hiring Scorecard based on JD, questions and transcribed answers.
   */
  private async handleScorecardGeneration(lastUserText: string, writer: any) {
    const currentState = this.state;
    
    // Parse the results from the user message if they were sent as JSON
    let results = [];
    try {
        const jsonPart = lastUserText.replace("INTERVIEW_RESULTS:", "").trim();
        results = JSON.parse(jsonPart);
    } catch (e) {
        console.error("Failed to parse results:", e);
    }

    if (!currentState?.jobDescription || results.length === 0) {
      writer.write({
        type: "text-delta",
        delta: "⚠️ Missing Job Description or Interview results to generate scorecard.",
        id: "error"
      });
      return;
    }

    writer.write({
      type: "text-delta",
      delta: "📊 Analyzing your performance and generating the scorecard...",
      id: "thinking"
    });

    // @ts-ignore
    const response = await this.env.AI.run("@cf/meta/llama-3.1-70b-instruct", {
      messages: [
        { 
          role: "system", 
          content: `You are an expert Technical Recruiter.
          OBJECTIVE: Evaluate the candidate's interview performance based on the Job Description.
          
          OUTPUT FORMAT:
          1. **Overall Mark:** [Mark 1-10/10]
          2. **Technical Depth:** [Evaluation of technical knowledge]
          3. **Behavioral Fit:** [Evaluation of soft skills]
          4. **How to Improve:** [Specific advice on how they could have answered better]
          5. **Professional Profile Advice:** [General advice on their career/profile for this role]
          
          Maintain a professional yet encouraging tone.` 
        },
        { 
          role: "user", 
          content: `Job Description: ${currentState.jobDescription}\n\nInterview Results:\n${JSON.stringify(results, null, 2)}` 
        }
      ]
    });

    const report = (response as any).response || "Failed to generate scorecard.";
    
    // Save to state
    await this.saveRecruiterState({
      ...currentState,
      scorecard: report
    });

    writer.write({
      type: "text-delta",
      delta: report,
      id: "scorecard"
    });
  }

  // 5. Main Chat Logic
  async onChatMessage(onFinish: StreamTextOnFinishCallback<any>, options?: { abortSignal?: AbortSignal }) {
    const currentState = this.state || { questions: [], currentQuestionIndex: -1 };
    const lastUserMessage = this.messages[this.messages.length - 1];
    const lastUserText = extractTextFromMessage(lastUserMessage);
    const cleanedText = lastUserText.trim().toLowerCase();

    const isResetCommand = ["clear", "reset", "restart", "start new session", "new session"].includes(cleanedText);
    const isScorecardRequest = lastUserText.startsWith("INTERVIEW_RESULTS:");

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          if (isResetCommand) {
            await this.clearInterview();
            writer.write({
              type: "text-delta",
              delta: "🔄 **Session Cleared.**\n\nI have forgotten the previous interview. Please paste a new Job Description to start over!",
              id: "system-reset"
            });
            return;
          }

          if (isScorecardRequest) {
            await this.handleScorecardGeneration(lastUserText, writer);
            return;
          }

          const isSetupPhase = (currentState.questions?.length || 0) === 0;
          const looksLikeJD = isSetupPhase && lastUserText.length > 50;

          if (looksLikeJD) {
            await this.handleJDAnalysis(lastUserText, writer);
          } else {
            await this.handleNormalChat(writer);
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