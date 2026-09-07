import {
  type Mention,
  type MentionCatalog,
  type MentionEntry,
  type NamedMentionKind,
  readMentions,
  sortMentionTokens,
} from "@/shared/console/mentions/scan"
import { jobSurfaceIntegrations } from "./catalog"

// A job's instructions mention integrations, skills, and tools by name —
// `@Gmail`, `/meeting-prep`, `#send_message` — through the shared mention
// scan, with the resource sigil left out: a job names what it may use,
// not what it is about.

export const jobMentionKinds = ["integration", "skill", "tool"] as const
export type JobMentionKind = (typeof jobMentionKinds)[number]

export type JobMentionCatalog = Record<
  NamedMentionKind,
  readonly MentionEntry[]
> &
  MentionCatalog

export type JobMention = Mention & { kind: JobMentionKind }

const integrationEntries: MentionEntry[] = jobSurfaceIntegrations.map(
  (item) => ({
    id: item.integration,
    tokens: sortMentionTokens([item.label.toLowerCase(), ...item.aliases]),
  })
)

/** Integrations are static; skills and tools are supplied by the edge that
 *  has them (the skills query and the resolved tool permissions). */
export function createJobMentionCatalog(
  input: { skills?: readonly string[]; tools?: readonly string[] } = {}
): JobMentionCatalog {
  return {
    integration: integrationEntries,
    skill: (input.skills ?? []).map((name) => ({
      id: name,
      tokens: [name.toLowerCase()],
    })),
    tool: (input.tools ?? []).map((tool) => ({
      id: tool,
      tokens: [tool.toLowerCase()],
    })),
  }
}

export const emptyJobMentionCatalog = createJobMentionCatalog()

export function readJobMentions(
  text: string,
  catalog: JobMentionCatalog
): JobMention[] {
  return readMentions(text, catalog).filter(isJobMention)
}

export function isJobMentionKind(kind: string): kind is JobMentionKind {
  return jobMentionKinds.some((candidate) => candidate === kind)
}

function isJobMention(mention: Mention): mention is JobMention {
  return isJobMentionKind(mention.kind)
}
