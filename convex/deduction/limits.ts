const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

// Slightly under the hourly cron so timing drift never skips a beat; the
// weekly consolidation cadence gets the same margin.
export const passCadenceMs = 55 * 60 * 1000
export const consolidationCadenceMs = 7 * dayMs - hourMs
export const bootstrapWindowMs = 45 * dayMs
export const bootstrapChunkMs = 7 * dayMs
export const bootstrapMaxChunksPerSweep = 8
export const staleRunningMultiplier = 2
export const sweepBatch = 50
export const minPassWindowMs = 5 * 60 * 1000

// Promotion to `confirmed` requires support from at least this many distinct
// integrations, or sightings spanning at least this many days, counted over
// the evidence of the belief's assigned efforts.
export const minSupportSources = 2
export const minSupportDaySpan = 5 * dayMs

// Efforts sighted within the window are context for both judges; anything
// older is dormant, leaves the payloads, and naturally chunks long-running
// work into fresh efforts.
export const effortActiveMs = 21 * dayMs
export const maxContextEfforts = 80
export const maxConsolidationEfforts = 200
export const maxEffortAnchors = 8
export const maxEffortPersons = 8
export const maxBeliefAnchors = 12
export const maxRollupSources = 8
export const effortJournalTail = 2
export const consolidationJournalTail = 12
export const maxMemberEffortNames = 8

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

export const judgeModel = "openai/gpt-5.6-sol"
export const judgeReasoning = "high" as const
// Sized for a busy bootstrap chunk: many creates with entries and citations,
// plus reasoning tokens, in one structured response.
export const judgeMaxTokens = 32_768
export const promptVersions = {
  effort: "effort-charter-v1",
  workstream: "workstream-charter-v2",
  consolidation: "workstream-consolidation-v1",
} as const
