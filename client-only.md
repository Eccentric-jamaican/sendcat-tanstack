# Client-Only App Performance Optimizations (First Pass)

This doc describes the initial client-side performance work implemented from `features.md` ("Client-only app performance optimizations").

## Summary

The goal of this pass was to improve perceived performance without introd\
ucing SSR, new infrastructure, or major refactors:

*   Reduce unnecessary network churn (debounced search).
*   Warm Convex query caches for likely-next navigation (idle + hover prefetch).
*   Cache heavy product detail lookups with TTL and in-flight de-dupe.
*   Reduce repeated CPU work during chat rendering.
*   Improve loading skeletons to make slow networks feel intentional.

## Changes (By File)

### `src/hooks/useDebouncedValue.ts` (new)

*   Added `useDebouncedValue(value, delayMs)` hook.
*   Used to debounce thread search input so the app does not re-query on every keystroke.

### `src/components/layout/Sidebar.tsx`

**Debounced thread search**

*   Added `debouncedSearchQuery = useDebouncedValue(searchQuery, 200)`.
*   Switched `api.threads.list` query to use `debouncedSearchQuery`.

**Type-safe skip while sessionId is not ready**

*   The query now skips when `sessionId` is empty.
*   This avoids passing `sessionId: undefined` to a query that expects `sessionId: string`.

**Prefetch chat data (idle + hover/focus)**

*

Added `useConvex()` to access `convex.query(...)` for one-off prefetch calls.

*

Implemented `prefetchThread(threadId)` which primes:

*   `api.threads.get` for the thread metadata
*   `api.messages.list` for the thread messages
*

Added a `prefetchedThreadsRef` Set to avoid repeatedly prefetching the same thread.

*

Triggered prefetch on:

*   Hover/focus of a thread item (`onMouseEnter` and `onFocus`)
*   A small idle prefetch that warms the cache for the first thread in the list

**Skeleton improvement**

*   Expanded the "threads loading" skeleton with a few extra placeholder bars.

### `src/lib/productDetailsCache.ts` (new)

In-memory cache for heavy product details:

*

TTL: 10 minutes.

*

In-flight de-dupe:

*   If multiple components request details for the same `productId` at the same time, only one network call is made.
*

API:

*   `getCachedProductDetails(productId)`
*   `setCachedProductDetails(productId, value)`
*   `getOrSetProductDetails(productId, fetcher)`

This is intentionally in-memory only (fastest win). If persistence across reloads becomes desirable, this can be upgraded to `sessionStorage`.

### `src/components/product/ProductDrawer.tsx`

*

Before fetching eBay details via `api.chat.getItemDetails`, the drawer checks `getCachedProductDetails(productId)`.

*

Fetch uses `getOrSetProductDetails(productId, fetcher)` so:

*   repeated open/close/open cycles do not re-fetch for 10 minutes
*   concurrent opens do not double-fetch

### `src/components/product/ProductCard.tsx`

Hover prefetch for eBay items:

*

Added `useAction(api.chat.getItemDetails)` and a hover-capable prefetch path:

*   Only runs for devices that match `(hover: hover)` to avoid wasted calls on mobile scroll.
*   Only runs when `product.source === "ebay"`.
*   Small delay (150ms) to avoid firing when the pointer just passes over quickly.
*

Prefetch stores mapped `Product` details in `productDetailsCache` via `getOrSetProductDetails`.

### `src/routes/chat.$threadId.tsx`

Reduced repeated CPU work and improved loading UI:

*

Built `toolOutputsByCallId` once via `useMemo`, instead of scanning the `messages` array for every tool call render.

*

Memoized:

*   `filteredMessages`
*   `groupedMessages`
*

Replaced the single pulse icon loading state with a skeleton UI that reads better on slow networks.

### `vite.config.ts`

Local dev reliability improvement:

*

TanStack devtools event bus defaults to port `42069`.

*

On this machine, `42069` was already taken, causing `npm run dev` to crash with `EADDRINUSE`.

*

Updated the devtools plugin config to use:

*   `TANSTACK_DEVTOOLS_EVENT_BUS_PORT` if set
*   otherwise default to `42070`

This is dev-only and does not change production behavior.

## How To Test (Manual)

1.

Start dev server: `npm run dev`

1.

Sidebar search:

*   Type quickly in "Search your threads..."
*   Confirm the app does not feel like it is re-fetching on each keystroke (requests should fire after a short delay).

1.

Thread prefetch:

*   Hover over a thread in the sidebar, then click it.
*   Navigation should feel snappier because `threads.get` and `messages.list` are already in Convex's client cache.

1.

Product drawer cache:

*   Open an eBay product drawer from Explore or a tool result.
*   Close it, reopen it.
*   The second open should avoid the long "Fetching details from eBay..." state (within the TTL window).

## What "First Pass" Means

This was the lowest-risk set of improvements that:

*   only touches the client
*   keeps the current data model and APIs
*   does not introduce SSR or a new caching framework
*   is reversible and easy to reason about

In practice: take the obvious wins first, verify nothing breaks, then iterate.

## Exploration Findings (Why Next Passes Matter)

Quick devtools plus build output review surfaced two concrete hotspots:

*   Bundle: `Sidebar-*.js` is ~597 KB minified in production output. `src/components/layout/Sidebar.tsx` currently imports markdown plus highlighting plus server-side rendering helpers that are only needed for export.
*   Network: `https://openrouter.ai/api/v1/models` is fetched twice on initial load because both `ChatInput` and `ModelPicker` fetch models on mount (with separate caching logic).

## Next Passes (Decision-Complete)

### Pass 2 (High impact, low behavioral risk)

1.

Centralize OpenRouter model caching and in-flight de-dupe

Goal: only fetch `openrouter.ai/api/v1/models` once per TTL across the entire app.

Approach:

*

Update `src/lib/openrouter.ts` so `fetchOpenRouterModels()`:

*   reads/writes `sendcat-models-cache` / `sendcat-models-cache-time` and migrates legacy `t3-models-cache` / `t3-models-cache-time` if present
*   uses a single TTL (24h)
*   implements in-flight de-dupe (same pattern as `src/lib/productDetailsCache.ts`)
*   remains safe on the server (guard `typeof window !== "undefined"`)
*

Simplify components to just call `fetchOpenRouterModels()` and remove duplicated caching code in:

*   `src/components/chat/ChatInput.tsx`
*   `src/components/chat/ModelPicker.tsx`
*   `src/components/chat/MessageActionMenu.tsx`
*   `src/components/chat/MessageEditInput.tsx`

1.

Acceptance:

*   Only one `GET https://openrouter.ai/api/v1/models` request occurs on cold start.
*   No request occurs on reload within TTL.

1.

Split Sidebar export code via dynamic import (bundle reduction)

Goal: stop loading export-only dependencies in the initial sidebar chunk.

Approach:

*

Create export modules that keep heavy dependencies out of the initial sidebar chunk:

*

`src/components/layout/sidebarExportBase.ts` (lightweight helpers for text/markdown export)

*

`src/components/layout/sidebarExportHtml.tsx` (HTML export only, holds heavy imports)

*

`renderToStaticMarkup` from `react-dom/server`

*

`ReactMarkdown`, `remark-gfm`, `rehype-highlight`

*

In `src/components/layout/Sidebar.tsx`, replace direct usage with dynamic imports at export time:

*   `const exportBase = await import("./sidebarExportBase")`
*   `const exportHtml = await import("./sidebarExportHtml")` (only for HTML export)
*

Optional: show a short "Preparing export..." state while the module loads.

1.

Acceptance:

*   `Sidebar-*.js` is materially smaller after build.
*   Export HTML/MD/TXT still works and looks identical.

1.

Route-level code prefetch for `/chat/$threadId`

Goal: when the user hovers a thread in the sidebar, preload the chat route chunk so navigation is instant.

Approach:

*   On thread item hover/focus in `src/components/layout/Sidebar.tsx`, call TanStack Router route preload for `/chat/$threadId` (code-split module).
*   Consider bumping `defaultPreloadStaleTime` in `src/router.tsx` from `0` to a small window (e.g. `30000`) so preloaded results stay usable.

1.

Acceptance:

*   Devtools shows the chat route chunk downloading on hover.
*   Clicking shortly after hover avoids the "loading" feel on slow networks.

### Pass 3 (Medium risk, high upside as data grows)

1.

Explore page caching with TTL

Goal: avoid re-fetching Explore sections on back/forward navigation.

Approach:

*   Add `src/lib/exploreSectionsCache.ts` (TTL plus in-flight de-dupe).
*   Use it in `src/routes/explore.index.tsx` to cache `getExploreItems({ section: "trending" })` and `{ section: "new" }` results.

1.

Virtualize long lists

Goal: keep UI responsive for large thread/message counts.

Approach:

*   Virtualize the sidebar thread list first.
*   Then evaluate chat message virtualization (harder due to variable heights and streaming updates).

## Suggested Metrics (So We Know It Worked)

*   Network: count `openrouter.ai/api/v1/models` requests on first load (target: 1).
*   Bundle: compare `Sidebar-*.js` size before/after dynamic import.
*   UX: hover a thread then click and compare time to first meaningful chat render.eeH
