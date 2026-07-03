import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
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

  return renderPromptTemplate(promptTemplates["agent/organization"], {
    organization: {
      name: facts?.name ?? null,
      summary: facts?.summary ?? null,
      aliases: aliases.length === 0 ? null : aliases.join(", "),
      domains: domains.length === 0 ? null : domains,
      workstreams: workstreams.length === 0 ? null : workstreams,
    },
  }).trim()
}
