import { getAttachment } from "./api";
import type { GmailHeader, GmailMessageFull, GmailMessagePart } from "./types";

function normalizeBase64Url(data: string): string {
  return data.replace(/-/g, "+").replace(/_/g, "/");
}

export function decodeBase64Url(data?: string): string {
  if (!data) return "";
  const normalized = normalizeBase64Url(data);
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const atobFn =
    typeof atob === "function"
      ? atob
      : (value: string) =>
          (globalThis as any).Buffer.from(value, "base64").toString("binary");

  const binary = atobFn(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export function stripHtmlToText(html: string): string {
  // Lightweight HTML -> text utility; good enough for receipts/ship notices.
  // Remove style/script/head blocks to avoid CSS noise.
  return html
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, " ")
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, " ")
    .replace(/<\s*head[^>]*>[\s\S]*?<\s*\/\s*head\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n")
    .replace(/<\s*\/(td|th|tr|li|div|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getHeaderValue(headers: GmailHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? null;
}

function findPartByMimeType(part: GmailMessagePart | undefined, mimeType: string): GmailMessagePart | null {
  if (!part) return null;
  if (part.mimeType?.toLowerCase() === mimeType.toLowerCase()) {
    return part;
  }
  if (!part.parts) return null;
  for (const child of part.parts) {
    const found = findPartByMimeType(child, mimeType);
    if (found) return found;
  }
  return null;
}

export function extractMessageBodies(message: GmailMessageFull): { text: string; html: string } {
  const payload = message.payload;
  if (!payload) return { text: "", html: "" };

  const textPart = findPartByMimeType(payload, "text/plain");
  const htmlPart = findPartByMimeType(payload, "text/html");

  const text = textPart?.body?.data ? decodeBase64Url(textPart.body.data) : "";
  const html = htmlPart?.body?.data ? decodeBase64Url(htmlPart.body.data) : "";

  return { text, html };
}

async function getPartBodyDecoded(
  accessToken: string,
  messageId: string,
  part: GmailMessagePart | null,
): Promise<string> {
  const body = part?.body;
  if (!body) return "";

  if (body.data) return decodeBase64Url(body.data);

  if (body.attachmentId) {
    try {
      const attachment = await getAttachment(
        accessToken,
        messageId,
        body.attachmentId,
      );
      return decodeBase64Url(attachment.data);
    } catch (err: any) {
      console.warn(
        `[Gmail] Failed to fetch attachment for message ${messageId}: ${err?.message ?? String(err)}`,
      );
      return "";
    }
  }

  return "";
}

export async function extractMessageBodiesWithAttachments(
  accessToken: string,
  message: GmailMessageFull,
): Promise<{ text: string; html: string }> {
  const payload = message.payload;
  const messageId = message.id;
  if (!payload || !messageId) return extractMessageBodies(message);

  const textPart = findPartByMimeType(payload, "text/plain");
  const htmlPart = findPartByMimeType(payload, "text/html");

  const [text, html] = await Promise.all([
    getPartBodyDecoded(accessToken, messageId, textPart),
    getPartBodyDecoded(accessToken, messageId, htmlPart),
  ]);

  return { text, html };
}

const DEFAULT_FOCUS_KEYWORDS = [
  "order number",
  "order #",
  "tracking number",
  "track your order",
  "tracking",
  "shipment",
  "shipped",
  "delivered",
  "estimated delivery",
  "delivery date",
  "total",
  "subtotal",
];

export function buildFocusedSnippet(
  text: string,
  opts?: { maxLen?: number; keywords?: string[] },
): string {
  const maxLen = opts?.maxLen ?? 4000;
  const keywords = opts?.keywords ?? DEFAULT_FOCUS_KEYWORDS;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;

  const lower = normalized.toLowerCase();
  const hits: number[] = [];
  for (const k of keywords) {
    const idx = lower.indexOf(k.toLowerCase());
    if (idx >= 0) hits.push(idx);
  }

  if (hits.length === 0) return normalized.slice(0, maxLen);

  hits.sort((a, b) => a - b);
  const windows: { start: number; end: number }[] = [];
  const before = 200;
  const after = 900;

  for (const idx of hits) {
    const start = Math.max(0, idx - before);
    const end = Math.min(normalized.length, idx + after);
    const last = windows[windows.length - 1];
    if (last && start <= last.end + 50) {
      last.end = Math.max(last.end, end);
    } else {
      windows.push({ start, end });
    }
  }

  let result = windows
    .map((w) => normalized.slice(w.start, w.end))
    .join(" ... ");

  if (result.length > maxLen) {
    result = result.slice(0, maxLen);
  }
  return result.trim();
}

export function getPrimaryHeaders(message: GmailMessageFull): GmailHeader[] {
  // Prefer headers on the top-level payload; fall back to empty array.
  return message.payload?.headers ?? [];
}
