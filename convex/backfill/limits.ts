import { bootstrapWindowMs } from "../deduction/limits"

// Backfill covers exactly the horizon the deduction bootstrap is willing to
// review, so history and judgment share one clock.
export const backfillWindowMs = bootstrapWindowMs

// Ingest pacing. Each step inserts at most one window's worth of events under
// the judge's cap (maxWindowEvents = 500) with room for live webhooks landing
// in the same window, then forces a catch-up pass and rests long enough for
// the next forced window to clear minPassWindowMs.
export const stepEvents = 400
export const stepDelayMs = 6 * 60 * 1000
export const recordBatch = 50

// Provider paging. GitHub pages REST with page numbers; Linear pages GraphQL
// with cursors. Repositories are capped by recent push so a large account
// backfills its active repos, not its archive.
export const githubPageSize = 100
export const linearPageSize = 50
export const maxRepositories = 30
