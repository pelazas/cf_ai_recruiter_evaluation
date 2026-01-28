// via https://github.com/vercel/ai/blob/main/examples/next-openai/app/api/use-chat-human-in-the-loop/utils.ts

import type {
  UIMessage,
  UIMessageStreamWriter,
  ToolSet,
  ToolCallOptions
} from "ai";
import { convertToModelMessages, isStaticToolUIPart } from "ai";
import { APPROVAL } from "./shared";

function isValidToolName<K extends PropertyKey, T extends object>(
  key: K,
  obj: T
): key is K & keyof T {
  return key in obj;
}

/**
 * Processes tool invocations where human input is required, executing tools when authorized.
 */
export async function processToolCalls<Tools extends ToolSet>({
  dataStream,
  messages,
  executions
}: {
  tools: Tools; // used for type inference
  dataStream: UIMessageStreamWriter;
  messages: UIMessage[];
  executions: Record<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: needs a better type
    (args: any, context: ToolCallOptions) => Promise<unknown>
  >;
}): Promise<UIMessage[]> {
  // Process all messages, not just the last one
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      const parts = message.parts;
      if (!parts) return message;

      const processedParts = await Promise.all(
        parts.map(async (part) => {
          // Only process static tool UI parts (dynamic tools handled separately)
          if (!isStaticToolUIPart(part)) return part;

          const toolName = part.type.replace(
            "tool-",
            ""
          ) as keyof typeof executions;

          // Only process tools that require confirmation (are in executions object) and are in 'input-available' state
          if (!(toolName in executions) || part.state !== "output-available")
            return part;

          let result: unknown;

          if (part.output === APPROVAL.YES) {
            // User approved the tool execution
            if (!isValidToolName(toolName, executions)) {
              return part;
            }

            const toolInstance = executions[toolName];
            if (toolInstance) {
              result = await toolInstance(part.input, {
                messages: await convertToModelMessages(messages),
                toolCallId: part.toolCallId
              });
            } else {
              result = "Error: No execute function found on tool";
            }
          } else if (part.output === APPROVAL.NO) {
            result = "Error: User denied access to tool execution";
          } else {
            // If no approval input yet, leave the part as-is for user interaction
            return part;
          }

          // Forward updated tool result to the client.
          dataStream.write({
            type: "tool-output-available",
            toolCallId: part.toolCallId,
            output: result
          });

          // Return updated tool part with the actual result.
          return {
            ...part,
            output: result
          };
        })
      );

      return { ...message, parts: processedParts };
    })
  );

  return processedMessages;
}

export function cleanupMessages(messages: UIMessage[]): UIMessage[] {
  // 1. Remove ONLY the bad parts, don't nuke the whole message
  const cleanMessages = messages.map(msg => {
    if (!msg.parts) return msg;
    
    // Keep parts that are NOT incomplete or failed tool calls
    const validParts = msg.parts.filter(part => {
      // Keep everything that isn't a tool part
      if (part.type === 'text') return true;
      if (!isStaticToolUIPart(part)) return true;

      // Filter out incomplete streaming
      if (part.state === "input-streaming") return false;

      // Filter out INVALID or ERROR tool calls/results
      // Logically, if a tool call failed, we don't want to show the model it failed
      // especially if it's a "No Such Tool" error, as it will just keep trying it.
      if ('invalid' in part && part.invalid) return false;
      if ('error' in part && part.error) return false;

      return true;
    });

    return { ...msg, parts: validParts };
  }).filter(msg => msg.parts && msg.parts.length > 0); // Remove empty messages

  return cleanMessages;
}

/**
 * NEW HELPER: Ensures we don't send a Tool Result without its parent Tool Call
 * Use this in your server.ts before processToolCalls
 */
export function getSafeHistory(messages: UIMessage[], maxMessages = 10): UIMessage[] {
  if (messages.length <= maxMessages) return messages;

  // Take the last N
  let slice = messages.slice(-maxMessages);

  // If we sliced in the middle of a tool chain (started with a Tool Result),
  // we need to look back and grab the Assistant message that requested it.
  const firstMsg = slice[0];
  
  // Check if first message is a tool result (often role='tool' in model messages, 
  // but in UIMessage check parts)
  const isToolResult = firstMsg.parts?.some(p => isStaticToolUIPart(p) && p.state === 'output-available');

  if (isToolResult) {
    const firstMsgIndex = messages.indexOf(firstMsg);
    if (firstMsgIndex > 0) {
      // Prepend the parent message
      slice = [messages[firstMsgIndex - 1], ...slice];
    }
  }

  return slice;
}
