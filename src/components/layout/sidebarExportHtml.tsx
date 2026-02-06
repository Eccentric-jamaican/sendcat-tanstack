import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import {
  escapeHtml,
  formatAttachments,
  formatMessageRole,
  formatToolCalls,
} from "./sidebarExportBase";

const CodeHeaderIcon = ({ type }: { type: "download" | "wrap" | "copy" }) => {
  if (type === "download") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    );
  }

  if (type === "wrap") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="6" x2="17" y2="6" />
        <line x1="3" y1="12" x2="13" y2="12" />
        <line x1="3" y1="18" x2="9" y2="18" />
        <path d="M17 12a4 4 0 1 1 0 8" />
        <polyline points="15 16 17 20 19 16" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
};

const renderMarkdownToHtml = (markdown: string) => {
  const components: any = {
    pre: ({ children }: any) => <>{children}</>,
    code: ({ className, children, inline }: any) => {
      if (inline) {
        return <code className="inline-code">{children}</code>;
      }

      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";

      return (
        <div className="code-card">
          <div className="code-header">
            <span className="code-lang">{language}</span>
            <div className="code-actions">
              <span className="code-action" aria-hidden>
                <CodeHeaderIcon type="download" />
              </span>
              <span className="code-action" aria-hidden>
                <CodeHeaderIcon type="wrap" />
              </span>
              <span className="code-action" aria-hidden>
                <CodeHeaderIcon type="copy" />
              </span>
            </div>
          </div>
          <pre className="code-body">
            <code className={className}>{children}</code>
          </pre>
        </div>
      );
    },
  };

  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>,
  );
};

export const formatTranscriptHtml = (entries: any[]) =>
  entries
    .map((msg) => {
      const role =
        msg.role === "tool"
          ? `Tool Output${msg.name ? ` (${msg.name})` : ""}`
          : formatMessageRole(msg.role ?? "message");
      const attachments = formatAttachments(msg.attachments);
      const toolCalls = formatToolCalls(msg.toolCalls);
      const bodyHtml =
        msg.role === "tool"
          ? `<pre class="tool-output"><code>${escapeHtml(
              msg.content?.trim() || "",
            )}</code></pre>`
          : renderMarkdownToHtml(msg.content?.trim() || "");

      const toolOutputsHtml = msg.toolOutputs?.length
        ? `<div class="tool-outputs">
          ${msg.toolOutputs
            .map((tool: any) => {
              const label = tool.name ? `Tool output (${tool.name})` : "Tool output";
              return `
              <div class="tool-output-inline">
                <div class="tool-output-label">${escapeHtml(label)}</div>
                <pre class="tool-output"><code>${escapeHtml(
                  tool.content?.trim() || "",
                )}</code></pre>
              </div>
            `;
            })
            .join("")}
        </div>`
        : "";

      const attachmentsHtml = attachments
        ? `<div class="meta"><div class="meta-title">Attachments</div><ul>${attachments
            .split("\n")
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join("")}</ul></div>`
        : "";

      const toolCallsHtml = toolCalls
        ? `<div class="meta"><div class="meta-title">Tool calls</div><ul>${toolCalls
            .split("\n")
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join("")}</ul></div>`
        : "";

      return `
      <section class="message">
        <h3>${escapeHtml(role)}</h3>
        <div class="message-body">${bodyHtml || "<p><em>No content</em></p>"}</div>
        ${toolOutputsHtml}
        ${attachmentsHtml}
        ${toolCallsHtml}
      </section>
    `;
    })
    .join("\n");

