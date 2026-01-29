import { shouldProcessGmailMessage } from "./filter";
import { extractMessageBodies, getPrimaryHeaders } from "./message";
import type { GmailMessageFull } from "./types";

export function classifyGmailMessage(
  message: GmailMessageFull,
  bodies?: { text: string; html: string },
) {
  const headers = getPrimaryHeaders(message);
  const { text, html } = bodies ?? extractMessageBodies(message);
  const lite = {
    id: message.id,
    threadId: message.threadId,
    internalDate: message.internalDate,
    labelIds: message.labelIds,
    snippet: message.snippet,
    payload: { headers },
  };

  return shouldProcessGmailMessage({
    message: lite,
    bodyText: text,
    bodyHtml: html,
  });
}
