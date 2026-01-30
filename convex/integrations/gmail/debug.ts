import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { classifyGmailMessage } from "./classify";
import { extractLikelyDkimDomains } from "./filter";
import {
  buildFocusedSnippet,
  extractMessageBodiesWithAttachments,
  stripHtmlToText,
} from "./message";
import { getMessage, getValidAccessToken, listMessages } from "./api";

export const debugListMessages = internalAction({
  args: {
    userId: v.string(),
    query: v.optional(v.string()),
    daysBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.integrations.gmail.oauth.getGmailConnection,
      { userId: args.userId },
    );
    if (!connection || connection.status !== "active") {
      throw new Error("Gmail not connected");
    }

    const { accessToken } = await getValidAccessToken(connection);

    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
    const listRes = await listMessages(accessToken, {
      daysBack: args.daysBack ?? 45,
      maxResults: limit,
      query: args.query,
    });

    const results = [];
    for (const msgRef of listRes.messages ?? []) {
      const full = await getMessage(accessToken, msgRef.id);
      const bodies = await extractMessageBodiesWithAttachments(
        accessToken,
        full,
      );
      const htmlText = bodies.html ? stripHtmlToText(bodies.html) : "";
      const text = bodies.text ?? "";
      const snippet = full.snippet ?? "";

      const headers = full.payload?.headers ?? [];
      const subject =
        headers.find((h: any) => h.name?.toLowerCase() === "subject")?.value ??
        "";
      const from =
        headers.find((h: any) => h.name?.toLowerCase() === "from")?.value ?? "";
      const dkimDomains = extractLikelyDkimDomains(headers);

      const combined = [subject, snippet, text, htmlText]
        .filter(Boolean)
        .join("\n");
      const focus = buildFocusedSnippet(combined, { maxLen: 1200 });

      const needles = [
        "order number",
        "order #",
        "tracking number",
        "track your order",
        "tracking",
        "shipped",
        "delivered",
        "estimated delivery",
        "total",
        "subtotal",
      ];
      const hitSummary = Object.fromEntries(
        needles.map((n) => [n, combined.toLowerCase().includes(n)]),
      );

      const classification = classifyGmailMessage(full, bodies);

      results.push({
        id: full.id,
        subject,
        from,
        dkimDomains,
        snippet,
        textLen: text.length,
        htmlLen: htmlText.length,
        focusPreview: focus.slice(0, 400),
        hitSummary,
        classification,
      });
    }

    return results;
  },
});
