const dayMs = 24 * 60 * 60 * 1000

// Slightly under the hourly cron so timing drift never skips a beat.
export const passCadenceMs = 55 * 60 * 1000
export const bootstrapWindowMs = 45 * dayMs
export const bootstrapChunkMs = 7 * dayMs
export const bootstrapMaxChunksPerSweep = 8
export const staleRunningMultiplier = 2
export const sweepBatch = 50
export const minPassWindowMs = 5 * 60 * 1000

// Promotion to `confirmed` requires support from at least this many distinct
// integrations, or sightings spanning at least this many days.
export const minSupportSources = 2
export const minSupportDaySpan = 5 * dayMs

export const maxBeliefAnchors = 12
export const rosterJournalTail = 3

// The roster slice runs carry: confirmed workstreams seen inside the rolling
// window, newest first, capped. Workstreams active within `rosterActiveMs`
// render in full; the rest shrink to a single line. Anything older is the
// deeper memory system's job, not the always-on prompt's.
export const rosterRecencyMs = 365 * dayMs
export const rosterActiveMs = 30 * dayMs
export const maxRosterEntries = 40

// Volume guards on judge input: shape volume down, never meaning up. When a
// window overflows, the newest records win and the rest wait for later passes.
export const maxWindowEvents = 500
export const maxWindowConversations = 200

export const judgeModel = "openai/gpt-5.5"
export const judgeReasoning = "high" as const
export const judgeMaxTokens = 8192
export const promptVersion = "workstream-charter-v1"
