import { routeAgentRequest } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  streamText,
  type StreamTextOnFinishCallback,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { processToolCalls, cleanupMessages, getSafeHistory } from "./utils";
import { tools, executions } from "./tools";

export interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
  responses: Record<number, string>;
}

export class Chat extends AIChatAgent<Env, RecruiterState> {
  async onInitialize() {
    const stored = await this.ctx.storage.get<RecruiterState>("recruiter_state");
    if (stored) {
      this.setState(stored);
    } else {
      this.setState({
        questions: [],
        currentQuestionIndex: -1,
        responses: {}
      });
    }
  }

  async saveRecruiterState(state: RecruiterState) {
    await this.ctx.storage.put("recruiter_state", state);
  }

  async clearInterview() {
    const freshState: RecruiterState = {
      questions: [],
      currentQuestionIndex: -1,
      responses: {}
    };
    this.setState(freshState);
    await this.ctx.storage.delete("recruiter_state");
  }

  async setupInterview(jobDescription: string, questions: string[]) {
    const newState = {
      ...this.state,
      jobDescription,
      questions,
      currentQuestionIndex: 0
    };
    this.setState(newState);
    await this.saveRecruiterState(newState);
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    console.log("Chat onChatMessage started");
    const currentState = this.state || { questions: [], currentQuestionIndex: -1, responses: {} };
    
    const workersai = createWorkersAI({ binding: this.env.AI });
    
    // CRITICAL FIX: Use Llama 3.1 for stable Tool Calling
    const model = workersai("@cf/meta/llama-3.1-70b-instruct" as any);

    const allTools = { ...tools };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          console.log("Stream execution started");
          const basicClean = cleanupMessages(this.messages);
          const safeMessages = getSafeHistory(basicClean, 12);
          
          const processedMessages = await processToolCalls({
            messages: safeMessages,
            dataStream: writer,
            tools: allTools,
            executions
          });

          // If a tool just ran (e.g., clear_interview), we might not need to call the LLM again immediately.
          // But for the setup flow, we proceed.

          const result = streamText({
            system: `You are an expert Technical Recruiter API.

      CURRENT STATUS:
      - Has JD: ${currentState.jobDescription ? "YES" : "NO"}
      
      INSTRUCTIONS:
      1. If the user sends a Job Description (JD), you must analyze it and immediately call the 'setup_interview' tool.
      2. DO NOT respond with text. Just call the tool.
      
      QUESTION GENERATION RULES:
      - **Quantity:** Exactly 5 questions (3 Technical, 2 Behavioral).
      - **Time Limit:** Questions must be answerable in 30-60 seconds.
      - **Content:**
         - Ignore fluff (mission, location).
         - Focus on specific tech stacks found in the JD.
         - 2 Behavioral questions should focus on soft skills found in JD (e.g. ownership).
      - **Style:**
         - "What is your experience with [Tech]?"
         - "Explain the difference between [Concept A] and [Concept B]."
      
      IMPORTANT:
      Use the exact tool name: "setup_interview".`,
            messages: await convertToModelMessages(processedMessages),
            model,
            tools: allTools,
            // @ts-ignore
            maxSteps: 5,
            onFinish: (async (event: any) => {
              // Detailed logging to catch any future "flakiness"
              if (event.toolCalls) {
                console.log("Tool calls detected:", JSON.stringify(event.toolCalls));
              }
              if (onFinish) {
                await (onFinish as any)(event);
              }
            }) as unknown as StreamTextOnFinishCallback<typeof allTools>,
            abortSignal: options?.abortSignal
          });

          writer.merge(result.toUIMessageStream());
        } catch (err: any) {
          console.error("CRITICAL ERROR:", err);
          writer.write({
            type: "error",
            errorText: "An internal error occurred."
          });
        }
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/check-open-ai-key") return Response.json({ success: true });

    if (url.pathname === "/transcribe" && request.method === "POST") {
        // ... (Keep your existing transcribe logic here)
        return new Response("Not implemented in snippet", { status: 501 });
    }

    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;