import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Get the current time in helpful format",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"]
      }
    }
  }
];

// Helper to accumulate tool calls from stream
function mergeToolCalls(acc: any[], defaults: any[]) {
  defaults.forEach((delta) => {
    const index = delta.index;
    if (!acc[index]) acc[index] = { id: "", type: "function", function: { name: "", arguments: "" } };
    
    if (delta.id) acc[index].id = delta.id;
    if (delta.function?.name) acc[index].function.name += delta.function.name;
    if (delta.function?.arguments) acc[index].function.arguments += delta.function.arguments;
  });
  return acc;
}

export const streamAnswer = action({ 
  args: { 
    threadId: v.id("threads"),
    modelId: v.optional(v.string()),
    reasoningEffort: v.optional(v.string()),
    webSearch: v.optional(v.boolean()),
    abortKey: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const MAX_CYCLES = 5;
    let cycle = 0;
    let currentMessageId: any = null;
    let shouldContinue = true;

    // Filter tools based on user preference
    const activeTools = TOOLS.filter(t => {
       if (t.function.name === 'search_web' && !args.webSearch) return false;
       return true;
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Mock mode logic (simplified)
      // ... (Returning existing mock mode logic would be complex in loop, skipping for brevity/assuming key exists or simple fallback)
       const messageId = await ctx.runMutation(api.messages.initializeAssistantMessage, {
          threadId: args.threadId,
          modelId: args.modelId,
        });
        await ctx.runMutation(api.messages.appendContent, { messageId, content: "Error: No API Key configured." });
        return;
    }

    // Create the assistant message once, before the loop
    const messageId = await ctx.runMutation(api.messages.initializeAssistantMessage, {
      threadId: args.threadId,
      modelId: args.modelId,
    });
    currentMessageId = messageId;

    while (shouldContinue && cycle < MAX_CYCLES) {
      shouldContinue = false; // Default to stop unless tool calls happen
      cycle++;

      // 2. Fetch Context
      const messages = await ctx.runQuery(api.messages.list, { threadId: args.threadId });

      // 3. Prepare OpenRouter Payload
      // In cycle 1, exclude current message (it's empty). In subsequent cycles, include it (has tool calls).
      const openRouterMessages = messages
        .filter((m: any) => {
          if (m._id === currentMessageId) {
            // Include current message only if it has tool calls (subsequent cycles)
            return m.toolCalls && m.toolCalls.length > 0;
          }
          return true;
        })
        .map((m: any) => {
        const msg: any = { role: m.role };
        
        // Content & Attachments
        if (m.attachments && m.attachments.length > 0) {
           const content = [{ type: "text", text: m.content || "" }] as any[];
           m.attachments.forEach((att: any) => {
              if (att.url) {
                 if (att.type.startsWith('image/') || att.type === 'application/pdf') {
                    content.push({ type: "image_url", image_url: { url: att.url } });
                 }
              }
           });
           msg.content = content;
        } else {
           msg.content = m.content;
        }

        // Tool related fields
        if (m.toolCalls) {
           msg.tool_calls = m.toolCalls;
        }
        if (m.role === "tool") {
           msg.tool_call_id = m.toolCallId;
           msg.content = m.content; // Tool output is string
        }
        
        return msg;
      });

      // 4. Call API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://t3.chat",
          "X-Title": "T3 Chat Replica",
        },
        body: JSON.stringify({
          model: args.modelId ?? "google/gemini-2.0-flash-exp:free",
          messages: openRouterMessages,
          tools: activeTools.length > 0 ? activeTools : undefined,
          tool_choice: activeTools.length > 0 && cycle === MAX_CYCLES ? "none" : undefined,
          // Only include reasoning if explicitly provided - frontend controls when to send based on model support
          ...(args.reasoningEffort ? { reasoning: { effort: args.reasoningEffort } } : {}),
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`OpenRouter API error: ${await response.text()}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedToolCalls: any[] = [];
      let lastCheck = 0;
      const abortCheckIntervalMs = 100;
      
      let isAborted = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            if (dataStr === "[DONE]") break;
            
            try {
              const data = JSON.parse(dataStr);
              const delta = data.choices[0]?.delta;
              // finish_reason currently unused

              // Check for abort via localStorage flag (passed from client)
              // We check this frequently for immediate cancellation
              if (args.abortKey && typeof localStorage !== 'undefined') {
                const abortValue = localStorage.getItem(args.abortKey);
                if (abortValue) {
                  console.log("Aborting stream via localStorage flag");
                  shouldContinue = false;
                  isAborted = true;
                  break;
                }
              }
              
              // Check if aborted by user via DB (throttle to every 200ms)
              if (Date.now() - lastCheck > abortCheckIntervalMs) {
                lastCheck = Date.now();
                const currentStatus = await ctx.runQuery(api.messages.getStatus, { messageId });
                console.log(`Checking status for ${messageId}: ${currentStatus}`);
                if (currentStatus === "aborted") {
                  console.log("Aborting stream due to user request");
                  shouldContinue = false;
                  isAborted = true;
                  break;
                }
              }

              // Handle Content
              if (delta?.content) {
                try {
                  await ctx.runMutation(api.messages.appendContent, {
                    messageId,
                    content: delta.content
                  });
                } catch (e: any) {
                  if (e.message.includes("aborted")) {
                    console.log("Stream aborted via mutation check");
                    shouldContinue = false;
                    isAborted = true;
                    break;
                  }
                  throw e;
                }
              }
              
              // Handle Tool Calls
              if (delta?.tool_calls) {
                accumulatedToolCalls = mergeToolCalls(accumulatedToolCalls, delta.tool_calls);
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
          
          if (isAborted) {
            break;
          }
        }
      }
      
      // 5. Post-Stream Processing
      if (!isAborted) {
         await ctx.runMutation(api.messages.updateStatus, { messageId, status: "completed" });
      }

      if (accumulatedToolCalls.length > 0) {
         // Save tool calls to message
         await ctx.runMutation(api.messages.saveToolCalls, {
            messageId,
            toolCalls: accumulatedToolCalls
         });

         // Execute Tools
         for (const tc of accumulatedToolCalls) {
            const name = tc.function.name;
            const argsStr = tc.function.arguments;
            let result = "Error executing tool";
            
            try {
               const argsObj = JSON.parse(argsStr);
               if (name === "get_current_time") {
                  result = new Date().toLocaleString();
               } else if (name === "search_web") {
                  const serperKey = process.env.SERPER_API_KEY;
                  if (!serperKey) {
                     result = "Error: SERPER_API_KEY not configured in environment variables. Please add it to use real search.";
                  } else {
                     const q = argsObj.query;
                     const res = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: {
                           "X-API-KEY": serperKey,
                           "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ q: q })
                     });
                     
                     if (!res.ok) {
                        result = JSON.stringify({ error: res.statusText });
                     } else {
                        const data = await res.json();
                        // Return raw JSON for frontend rendering, model can parse it too
                        result = JSON.stringify(data.organic?.slice(0, 5) || []);
                     }
                  }
               }
            } catch (err: any) {
               result = `Error: ${err.message}`;
            }

            // Create Tool Result Message
            await ctx.runMutation(api.messages.send, {
               threadId: args.threadId,
               role: "tool",
               content: result,
               toolCallId: tc.id,
               name: name
            });
         }
         
         // Continue loop to let model interpret results
         shouldContinue = true;
      }
    }
    return currentMessageId;
  },
});
