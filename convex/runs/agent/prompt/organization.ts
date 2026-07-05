import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { formatAge, formatMonth } from "../../../../prompts/time"
import { rosterActiveMs } from "../../../deduction/limits"
import { type WorkstreamContext } from "../../../deduction/roster"
import { type AgentRuntimeInput } from "../input"

// The organization message: tenant-scoped context (approved facts and the
// deduced workstream roster) delivered as data alongside the run prompt,
// never as instructions. Renders when anything is known, so a tenant that
// skipped onboarding still gets its roster.
export function createOrganizationMessage(input: AgentRuntimeInput) {
  const facts = input.organization
  const workstreams = input.workstreams ?? []

  if (!facts?.name && workstreams.length === 0) {
    return ""
  }

  const aliases = facts?.aliases ?? []
  const domains = facts?.domains ?? []
  const roster = splitRoster(workstreams)

  return renderPromptTemplate(promptTemplates["agent/organization"], {
    organization: {
      name: facts?.name ?? null,
      summary: facts?.summary ?? null,
      aliases: aliases.length === 0 ? null : aliases.join(", "),
      domains: domains.length === 0 ? null : domains,
      workstreams: roster.active.length === 0 ? null : roster.active,
      quiet: roster.quiet.length === 0 ? null : roster.quiet,
    },
  }).trim()
}

// Recently active workstreams keep their brief; quieter ones shrink to a
// single line, so a long roster window stays cheap. Both carry the same
// timeline so the model can weigh entries by age instead of trusting them
// uniformly.
function splitRoster(workstreams: WorkstreamContext[], now = Date.now()) {
  const entries = workstreams.map((workstream) => ({
    active: now - workstream.seenAt <= rosterActiveMs,
    brief: workstream.brief,
    name: workstream.name,
    timeline: createTimeline(workstream, now),
  }))

  return {
    active: entries.filter((entry) => entry.active),
    quiet: entries.filter((entry) => !entry.active),
  }
}

function createTimeline(workstream: WorkstreamContext, now: number) {
  const tracked = formatMonth(workstream.createdAt)
  const seen = formatAge(now - workstream.seenAt)

  return `tracked since ${tracked}, last active ${seen}`
}
