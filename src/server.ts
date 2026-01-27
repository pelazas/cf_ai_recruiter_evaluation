import { routeAgentRequest } from "agents";

import { AIChatAgent } from "@cloudflare/ai-chat";
import {
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
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

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
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
    // Use type assertion to avoid model ID validation errors
    const model = workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast" as any);

    // Collect all tools
    const allTools = {
      ...tools
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          console.log("Stream execution started");
          const basicClean = cleanupMessages(this.messages);
          const safeMessages = getSafeHistory(basicClean, 12); // Use the new helper
          
          const processedMessages = await processToolCalls({
            messages: safeMessages,
            dataStream: writer,
            tools: allTools,
            executions
          });

          console.log("Messages processed, starting streamText");
          const result = streamText({
            system: `You are an Engineering Hiring Manager.
      
      Current State:
      - JD Captured: ${currentState.jobDescription ? "Yes" : "No"}
      - Questions Stored: ${currentState.questions?.length ?? 0}
      
      **MANDATORY:** If the user provides a Job Description, you MUST call 'save_interview_setup' to save it along with the questions.
      
      **CRITICAL:**
      1. **Ignore Fluff:** Do NOT ask about the company mission, or location. Extract the specific technologies and soft skills (e.g., curiosity, ownership) mentioned and ask about those.
      2. **Time Limit:** Questions must be answerable in **30-60 seconds**. Avoid broad system design topics.
      3. **Difficulty:** Test foundational knowledge and trainability. 3 technical questions and 2 behavioral
      4. **Question Style:** - **Technical Preferences:** (e.j. "What is your experience with AI agents?")
         - **Concept Checks:** "What is the difference between TCP and UDP?" (Tests fundamentals).
         - **Experience:** "Briefly describe a bug that was hard to track down."
`,
            messages: await convertToModelMessages(processedMessages),
            model,
            tools: allTools,
            stopWhen: stepCountIs(5),
            onFinish: (async (event: any) => {
              console.log("streamText onFinish triggered");
              if (event.toolCalls) {
                console.log("Tool calls detected:", event.toolCalls.map((tc: any) => tc.toolName));
              }
              // First call the original onFinish to handle standard AI Chat Agent logic (saving messages, etc.)
              if (onFinish) {
                await (onFinish as any)(event);
              }
            }) as unknown as StreamTextOnFinishCallback<typeof allTools>,
            abortSignal: options?.abortSignal
          });

          writer.merge(result.toUIMessageStream());
        } catch (err: any) {
          console.error("CRITICAL ERROR in stream execution:", err);
          // Don't leak too much info to UI but log it all here
          console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
          
          writer.write({
            type: "error",
            errorText: "An internal error occurred while processing your request."
          });
        }
      }
    });

    return createUIMessageStreamResponse({ stream });
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/check-open-ai-key") {
      // For this app we use Workers AI, but we keep this for the template's sake or adjust it
      return Response.json({
        success: true // We use Workers AI
      });
    }

    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
