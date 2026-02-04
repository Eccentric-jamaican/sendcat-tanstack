# Features Backlog

## Gmail inbox watch + manual sync (hybrid)

Goal: automatically watch a user's inbox for order confirmations (near-real-time) while still providing manual controls ("Sync now" and a one-time backfill) for recovery and testing.

Key behaviors

- Auto-watch enabled after OAuth; new order emails create drafts/pre-alerts without user action.
- Manual "Sync now" triggers a short lookback (e.g., 3–7 days).
- Optional "Backfill 30 days" for first-time connect or troubleshooting.
- Clear UI state: watch status, last sync time, and any errors.

Likely files to touch

- `convex/integrations/gmail/api.ts` (Gmail watch setup / renew)
- `convex/integrations/gmail/oauth.ts` (persist watch metadata, connection status)
- `convex/integrations/gmail/sync.ts` (manual sync + backfill parameters)
- `convex/integrations/gmail/connection.ts` (connection model updates)
- `convex/integrations/evidence.ts` (draft/pre-alert creation paths)
- `src/routes/settings.tsx` (UI for watch status + Sync now + Backfill)
- `src/routes/pre-alerts.tsx` (display auto-created drafts and status)
- `convex/schema.ts` (if new fields are needed for watch state)

## Add badge to pre alerts sidebar element

Goal: When a sync is performed (currently only gmail) the user gets a subtle indicator letting them know there is a draft for them to confirm.
in the future if the user has not responded then they get either whatsapp message reminding them to confirm or email. It would be nice for the user to confirm right then and there in the whatsapp thread or email once they see it.

## Firecrawl integration

Goal: add Firecrawl as a first-class web extraction option for link previews, summaries, and search result enrichment.

Key behaviors

- Support a Firecrawl-backed fetch for external URLs with structured data and readable text.
- Allow choosing Firecrawl for search results or fallback when standard fetching fails.
- Enrich global product results by resolving merchant product links when only Google Shopping URLs are available.
- Store extraction metadata (source url, status, timing) for debugging and UX transparency.

Likely files to touch

- `src/components/chat/Markdown.tsx` (trigger extraction for external link previews)
- `src/components/chat/SearchToolResult.tsx` (enrich search results with Firecrawl data)
- `convex/chatHttp.ts` or `convex/http.ts` (server-side fetch / tool integration)
- `convex/schema.ts` (optional storage for extraction metadata)
- `src/routes/settings.tsx` (toggle or API key management if user-configurable)

## Multimodal UX improvements (OpenRouter)

Goal: improve multimodal chat experience by guiding model selection and supporting additional media types.

Key behaviors

- When attachments include images, surface a UI hint recommending a vision-capable model.
- Optionally filter the model picker to vision-capable models while image attachments are present.
- Add support for audio/video attachments per OpenRouter multimodal spec (including input formats and validation).

Likely files to touch

- `src/components/chat/ChatInput.tsx` (attachment-driven UI hints + model filtering)
- `src/components/chat/MessageEditInput.tsx` (same behaviors for edit flow)
- `src/components/chat/ModelPicker.tsx` (filtering UI logic)
- `convex/chat.ts` (build multimodal payload for audio/video)
- `convex/chatHttp.ts` (HTTP stream payload for audio/video)
- `convex/schema.ts` (attachment metadata updates if needed)

## EPN affiliate tracking (eBay)

Goal: monetize eBay purchase intent by attaching EPN tracking parameters to outbound eBay links and displaying compliant disclosure in the product drawer.

Key behaviors

- Build EPN tracking URLs dynamically for all eBay item links (no prebuilt URLs).
- Attach a hashed `customid` derived from `userId` (logged-in) or `sessionId` (anonymous), using SHA-256 + server salt (no PII).
- Show a subtle disclosure near eBay call-to-action links in the product drawer.
- Store EPN parameters in Convex env vars; do not hardcode in client.

Notes

- Set `EPN_CAMPID`, `EPN_MKCID`, `EPN_MKRID`, `EPN_TOOLID`, `EPN_MKEVT`, and `EPN_CUSTOMID_SALT` in Convex.
- Replace placeholder salts in dev with a real secret before production.

## Sentry-driven auto-remediation (future)

Goal: use Sentry error events to trigger an AI agent that triages, reproduces, and proposes fixes via PRs.

Key behaviors

- Sentry webhook triggers a remediation job on new high-priority issues.
- Agent pulls stack traces, release info, and user/session context to reproduce.
- Generates a patch + PR with a concise explanation and test plan.
- Human review gate remains mandatory before merge.

Likely files to touch

- `convex/http.ts` or `src/routes/api/*` (webhook receiver)
- `convex/agents/*` or `src/lib/agents/*` (agent runner + tools)
- `convex/schema.ts` (store remediation runs + status)
- `src/routes/settings.tsx` (toggle + webhook status)

## Client-only app performance optimizations (future)

Goal: improve perceived performance of the client-only app with targeted prefetching and caching (no SSR).

Key behaviors

- Prefetch chat threads and product data after initial load (idle or hover-triggered).
- Cache heavy responses (search results, product detail lookups) with clear TTLs.
- Add skeletons to reduce perceived latency on slow networks.

Likely files to touch

- `src/lib/queryClient.ts` or `src/lib/cache.ts` (cache/prefetch helpers)
- `src/routes/chat.$threadId.tsx` (prefetch + skeletons)
- `src/components/product/*` (detail caches + placeholders)
- `convex/chat.ts` / `convex/search.ts` (optional caching hints)

## LLM usage analytics (OpenRouter) (future)

Goal: capture server-side OpenRouter usage events (model, tokens, latency, cost estimates) in PostHog.

Key behaviors

- Emit a server-side PostHog event after each OpenRouter call completes.
- Include model ID, prompt/response token counts, latency, and thread/session IDs.
- Distinguish retries, tool calls, and error outcomes.

Likely files to touch

- `convex/chat.ts` / `convex/chatHttp.ts` (post-call event emission)
- `convex/lib/analytics.ts` (server-side PostHog client helper)
- `convex/schema.ts` (optional: persist usage snapshots)

## Agent labels + agentic sourcing loop

Goal: simplify model selection with high-level labels (e.g., "Fast" and "Agent") and add an agentic loop so sourcing can iteratively refine queries, broaden coverage, and improve result quality.

Key behaviors

- Replace long model lists with a small set of labels (e.g., Fast, Agent, Balanced) that map to curated model IDs.
- Preserve direct model selection behind an advanced toggle (optional).
- Agentic loop can: reformulate queries, run multiple product searches, merge + dedupe results, and stop on coverage thresholds.
- Keep a clear cap on calls per turn and surface a concise summary of what was tried.

Likely files to touch

- `src/components/chat/ModelPicker.tsx` (label-based model UI + optional advanced toggle)
- `src/components/chat/ChatInput.tsx` (store label selection, map to modelId)
- `convex/lib/models.ts` (label-to-model mapping helpers)
- `convex/chat.ts` (agentic loop orchestration for product sourcing)
- `convex/chatHttp.ts` (agentic loop orchestration for SSE path)
- `convex/messages.ts` (optional: store agentic loop metadata)
