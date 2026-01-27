import { tool } from "ai";
import { z } from "zod";
import type { Chat } from "./server";
import { getCurrentAgent } from "agents";

export const tools = {
  setup_interview: tool({
    description: "Generates 5 interview questions based on the Job Description. Call this immediately when a JD is provided.",
    inputSchema: z.object({
      jd: z.string().describe("The full job description text."),
      questions: z.array(z.string())
        .describe("Array of exactly 5 interview questions (3 technical, 2 behavioral).")
    }),
    execute: async ({ jd, questions }) => {
      console.log("TOOL EXECUTE: setup_interview");
      const { agent } = getCurrentAgent<Chat>();
      
      if (!agent) {
        return { success: false, error: "Agent not found" };
      }

      const chatAgent = agent as Chat;
      
      // Safety: Handle edge case where model sends a stringified JSON instead of array
      let finalQuestions = questions;
      if (typeof questions === 'string') {
        try { finalQuestions = JSON.parse(questions); } catch(e) { 
           console.error("Failed to parse questions string", e);
           finalQuestions = ["Could not generate questions. Please try again."];
        }
      }

      await chatAgent.setupInterview(jd, finalQuestions);

      return { 
        success: true, 
        message: "Interview generated and saved." 
      };
    }
  }),
  
  clear_interview: tool({
    description: "Resets the interview state. Use only if user asks to 'clear', 'reset' or 'start over'.",
    inputSchema: z.object({}),
    execute: async () => {
      const { agent } = getCurrentAgent<Chat>();
      if (!agent) return { success: false, error: "Agent not found" };
      
      await (agent as Chat).clearInterview();
      return { success: true, message: "Interview cleared" };
    }
  })
};

export const executions = {};