import {
  type Integration,
  integrationLabel,
  type ToolSurface,
} from "@contracts/integrations"
import { type MentionResource } from "@contracts/replies/answers"
import { type MessageContext } from "@contracts/replies/references"
import { targetKey } from "../references"
import { referencePresentation } from "../references/presentation"
import { type ActiveMention } from "./active"
import { rankByName } from "./rank"
import {
  type MentionCatalog,
  type MentionKind,
  type NamedMentionKind,
  sortMentionTokens,
} from "./scan"

export type { MentionResource } from "@contracts/replies/answers"

export type MentionTool = {
  surface: ToolSurface
  tool: string
}

/** What a composer can mention, handed to it by the host: the console
 *  reads them from Convex, a demo from fixtures. The host may narrow the
 *  resources to what is searched for; the lists are what it has now. */
export type MentionSources = {
  integrations: readonly Integration[]
  resources: readonly MentionResource[]
  skills: readonly string[]
  tools: readonly MentionTool[]
  /** Called as the person searches, so a host can narrow the resources
   *  server-side; the lists above follow. Called with nothing once the
   *  search ends — the listbox closed, the menu put away — so a host can
   *  let its lookup go until the next one starts. */
  onSearch?: (query: string | null) => void
  /** Set while a host's lookup for the current search is on its way, so
   *  an empty list reads as "looking" and Enter waits for it. */
  searching?: boolean
}

export type MentionSuggestion = {
  /** One line beside the name: what a resource is. */
  detail?: string
  disabled?: boolean
  id: string
  label: string
} & (
  | { kind: "resource"; surface?: never; target: MessageContext }
  | {
      kind: NamedMentionKind
      /** The integration whose mark stands for it. */
      surface?: string
      target?: never
    }
)

export const emptyMentionSources: MentionSources = {
  integrations: [],
  resources: [],
  skills: [],
  tools: [],
}

/** What the sources let the scan recognize: every name the host offers,
 *  and any resource token. */
export function createMentionCatalog(sources: MentionSources): MentionCatalog {
  return {
    integration: sources.integrations.map((integration) => ({
      id: integration,
      tokens: sortMentionTokens([
        integrationLabel(integration).toLowerCase(),
        integration.toLowerCase(),
      ]),
    })),
    resource: true,
    skill: sources.skills.map((name) => ({
      id: name,
      tokens: [name.toLowerCase()],
    })),
    tool: sources.tools.map((tool) => ({
      id: tool.tool,
      tokens: [tool.tool.toLowerCase()],
    })),
  }
}

/** The few items worth offering for what is being typed after a sigil. */
export function suggestMentions(
  active: Pick<ActiveMention, "kind" | "query">,
  sources: MentionSources
): MentionSuggestion[] {
  return rankByName(active.query, mentionOptions(active.kind, sources))
}

/** Every item a kind offers, unranked. */
function mentionOptions(
  kind: MentionKind,
  sources: MentionSources
): MentionSuggestion[] {
  switch (kind) {
    case "integration":
      return sources.integrations.map((integration) => ({
        id: integration,
        kind,
        label: integrationLabel(integration),
        surface: integration,
      }))
    case "resource":
      return sources.resources.map(resourceSuggestion)
    case "skill":
      return sources.skills.map((name) => ({ id: name, kind, label: name }))
    case "tool":
      return sources.tools.map((tool) => ({
        id: tool.tool,
        kind,
        label: tool.tool,
        surface: tool.surface,
      }))
  }
}

export function resourceSuggestion(
  resource: MentionResource
): MentionSuggestion {
  const { name, ...target } = resource

  return {
    detail: referencePresentation(target.kind, name).label,
    id: targetKey(target),
    kind: "resource",
    label: name,
    target,
  }
}
