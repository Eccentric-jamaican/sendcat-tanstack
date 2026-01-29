# Features Backlog

## Gmail inbox watch + manual sync (hybrid)

Goal: automatically watch a user’s inbox for order confirmations (near-real-time) while still providing manual controls ("Sync now" and a one-time backfill) for recovery and testing.

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