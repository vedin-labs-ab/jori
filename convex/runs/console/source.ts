import { type ToolSurface } from "../../shared/integrations"
import { type getRunContext } from "./context"

type RunContext = Awaited<ReturnType<typeof getRunContext>>

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type RunSource = {
  type: "automation" | "event" | "manual" | "message"
  surface?: ToolSurface
  stop?: {
    actor: SourceDatum
  }
  url?: string
}

export function runSource(
  context: RunContext,
  stoppedBy: string | undefined
): RunSource {
  const source: RunSource = {
    ...context.run.snapshot.source,
  }

  if (stoppedBy !== undefined) {
    source.stop = { actor: { type: "user", label: stoppedBy } }
  }

  return source
}

export function sourceSearchText(source: RunSource) {
  return [source.type, source.surface, source.url, source.stop?.actor.label]
    .filter(Boolean)
    .join(" ")
}
