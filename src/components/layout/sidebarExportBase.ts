export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatMessageRole = (role: string) =>
  role.charAt(0).toUpperCase() + role.slice(1);

type TranscriptAttachment = {
  name: string;
  type: string;
  size: number;
};

type TranscriptToolCall = {
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type TranscriptMessage = {
  role?: string;
  name?: string;
  content?: string;
  toolCallId?: string;
  attachments?: TranscriptAttachment[];
  toolCalls?: TranscriptToolCall[];
};

type TranscriptEntry = TranscriptMessage & {
  toolOutputs: TranscriptMessage[];
  isOrphanTool?: boolean;
};

export const formatAttachments = (
  attachments: TranscriptAttachment[] | undefined,
) => {
  if (!attachments || attachments.length === 0) return "";
  return attachments
    .map((att) => `${att.name} (${att.type}, ${Math.round(att.size / 1024)}kb)`)
    .join("\n");
};

export const formatToolCalls = (toolCalls: TranscriptToolCall[] | undefined) => {
  if (!toolCalls || toolCalls.length === 0) return "";
  return toolCalls
    .map(
      (call) =>
        `${call.function?.name ?? "tool"}(${call.function?.arguments ?? ""})`,
    )
    .join("\n");
};

export const normalizeTranscriptEntries = (messages: TranscriptMessage[]) => {
  const entries: TranscriptEntry[] = [];
  const assistantByToolCall = new Map<string, TranscriptEntry>();

  messages.forEach((msg) => {
    if (msg.role === "tool") {
      const key = msg.toolCallId;
      const target = key ? assistantByToolCall.get(key) : null;
      if (target) {
        target.toolOutputs.push(msg);
        return;
      }

      entries.push({ ...msg, toolOutputs: [], isOrphanTool: true });
      return;
    }

    const entry: TranscriptEntry = { ...msg, toolOutputs: [] };
    entries.push(entry);

    if (msg.toolCalls) {
      msg.toolCalls.forEach((call) => {
        if (call.id) assistantByToolCall.set(call.id, entry);
      });
    }
  });

  return entries;
};

const formatToolOutputsText = (toolOutputs: TranscriptMessage[]) =>
  toolOutputs
    .map((tool) => {
      const label = tool.name ? `Tool output (${tool.name})` : "Tool output";
      return `${label}:\n${tool.content?.trim() || ""}`;
    })
    .join("\n\n");

export const formatTranscriptText = (entries: TranscriptEntry[]) =>
  entries
    .map((msg) => {
      const roleLabel =
        msg.role === "tool"
          ? `TOOL OUTPUT${msg.name ? ` (${msg.name})` : ""}`
          : (msg.role?.toUpperCase() ?? "MESSAGE");
      const content = msg.content?.trim() || "";
      const attachments = formatAttachments(msg.attachments);
      const toolCalls = formatToolCalls(msg.toolCalls);
      const sections = [content];

      if (msg.toolOutputs?.length) {
        sections.push(formatToolOutputsText(msg.toolOutputs));
      }

      if (attachments) {
        sections.push(`Attachments:\n${attachments}`);
      }

      if (toolCalls) {
        sections.push(`Tool calls:\n${toolCalls}`);
      }

      return `${roleLabel}\n${sections.join("\n\n")}`.trim();
    })
    .join("\n\n---\n\n");

export const formatTranscriptMarkdown = (entries: TranscriptEntry[]) =>
  entries
    .map((msg) => {
      const role =
        msg.role === "tool"
          ? `Tool Output${msg.name ? ` (${msg.name})` : ""}`
          : formatMessageRole(msg.role ?? "message");
      const content = msg.content?.trim() || "";
      const attachments = formatAttachments(msg.attachments);
      const toolCalls = formatToolCalls(msg.toolCalls);
      const sections = [] as string[];

      if (msg.role === "tool") {
        sections.push(`\`\`\`\n${content}\n\`\`\``);
      } else {
        sections.push(content || "_No content_");
      }

      if (msg.toolOutputs?.length) {
        const outputs = msg.toolOutputs
          .map((tool) => {
            const label = tool.name ? `Tool output (${tool.name})` : "Tool output";
            return `> ${label}\n>\n> \`\`\`\n> ${tool.content?.trim() || ""}\n> \`\`\``;
          })
          .join("\n\n");
        sections.push(outputs);
      }

      if (attachments) {
        sections.push(
          `**Attachments**\n\n${attachments
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")}`,
        );
      }

      if (toolCalls) {
        sections.push(
          `**Tool calls**\n\n${toolCalls
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")}`,
        );
      }

      return `### ${role}\n\n${sections.join("\n\n")}`;
    })
    .join("\n\n---\n\n");

