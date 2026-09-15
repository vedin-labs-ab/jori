import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type AgentRuntimeInput } from "../input"

// The organization message: the approved organization facts delivered as
// data alongside the run prompt, never as instructions. Renders only when a
// name is approved, so an organization that skipped onboarding gets nothing.
export function createOrganizationMessage(input: AgentRuntimeInput) {
  const facts = input.organization

  if (!facts?.name) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["agent/organization"], {
    organization: {
      name: facts.name,
      summary: facts.summary ?? null,
      aliases: facts.aliases.length === 0 ? null : facts.aliases.join(", "),
      domains: facts.domains.length === 0 ? null : facts.domains,
    },
  })
}
