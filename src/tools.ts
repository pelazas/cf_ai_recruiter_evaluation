/**
 * Tool definitions for the AI Recruiter agent
 */
import { tool } from "ai";
import { z } from "zod";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";

/**
 * Tool to save the Job Description and generated questions to the Durable Object state
 */
export const tools = {
  save_interview_setup: tool({
    description: "Save the job description and the 5 generated technical questions to the system.",
    inputSchema: z.object({
      jobDescription: z.string().describe("The full job description provided by the user"),
      questions: z.array(z.string()).min(1).describe("The list of technical questions generated based on the JD")
    }),
    execute: async ({ jobDescription, questions }) => {
      console.log("TOOL EXECUTE: save_interview_setup", { jobDescription, questions });
      const { agent } = getCurrentAgent<Chat>();
      
      if (!agent) {
        console.error("TOOL ERROR: Agent not found inside save_interview_setup");
        return { success: false, error: "Agent not found" };
      }

      // Update agent state
      const chatAgent = agent as Chat;
      
      await chatAgent.setupInterview(jobDescription, questions);

      console.log("TOOL SUCCESS: Interview setup saved");
      return { 
        success: true, 
        message: "Interview setup saved successfully. 5 questions stored." 
      };
    }
  }),
  clear_interview: tool({
    description: "CRITICAL: Only use this if the user specifically types words like 'reset', 'clear', or 'start over'. Do not use this during normal Job Description analysis.",
    inputSchema: z.object({}),
    execute: async () => {
      console.log("TOOL EXECUTE: clear_interview");
      const { agent } = getCurrentAgent<Chat>();
      if (!agent) return { success: false, error: "Agent not found" };
      
      const chatAgent = agent as Chat;
      await chatAgent.clearInterview();
      
      return { success: true, message: "Interview cleared successfully" };
    }
  })
};

/**
 * Executions for tools that require human confirmation.
 * For now, we are making everything automatic for Phase 1.
 */
export const executions = {};
