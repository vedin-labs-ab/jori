import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { formatAge } from "../../../prompts/time"
import { messageSurfaceLabel } from "../../shared/integrations"
import { type RecencyEntry } from "./load"

export function renderPersonContext(args: {
  entries: RecencyEntry[]
  name: string
}) {
  return renderPromptTemplate(promptTemplates["agent/session/person"], {
    person: {
      items: args.entries.map(recencyItem),
      name: args.name,
    },
  })
}

function recencyItem(entry: RecencyEntry) {
  return {
    age: entry.kind === "summary" ? formatAge(entry.ageMs) : null,
    identifiers:
      entry.identifiers.length === 0 ? null : entry.identifiers.join(", "),
    summary: entry.kind === "summary" ? entry.summary : null,
    surface: messageSurfaceLabel(entry.surface),
  }
}
