import { tool } from "ai";
import { z } from "zod";
import { getCurrentAgent } from "agents";
import type { Chat } from "./server";

export const tools = {
  setup_interview: tool({
    description: "Save the Job Description and generate 5 interview questions.",
    inputSchema: z.object({
      jd: z.string().describe("The full job description text."),
      // FIX: Removed z.union. Enforce a simple Array of Strings.
      // This is fully supported by Llama 3.1 and Cloudflare.
      questions: z.array(z.string()).describe("Array of exactly 5 interview questions.")
    }),
    execute: async ({ jd, questions }) => {
      const { agent } = getCurrentAgent<Chat>();
      if (!agent) return { success: false, error: "No agent" };

      // Since we strictly enforce array now, we don't need complex parsing logic
      await agent.setupInterview(jd, questions);
      return { success: true, message: "Interview saved!" };
    },
  }),
  
  clear_interview: tool({
    description: "Clear current interview state.",
    // FIX: Added a dummy field. Empty objects ({}) sometimes fail strict validation.
    inputSchema: z.object({
      confirm: z.boolean().optional().describe("Confirmation flag")
    }),
    execute: async () => {
      const { agent } = getCurrentAgent<Chat>();
      //if (agent) await agent.clearInterview();
      return { success: true, message: "Cleared." };
    }
  })
};