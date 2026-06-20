import { type SourceMetadataItem } from "../../shared/sources/schema"
import { type getRunContext } from "./context"

type RunContext = Awaited<ReturnType<typeof getRunContext>>

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type RunSource = {
  type: "automation" | "event" | "manual" | "message"
  event?: SourceDatum
  kind?: SourceDatum
  metadata: SourceMetadataItem[]
  surface?: SourceDatum
  stop?: {
    actor: SourceDatum
  }
}

export function runSource(
  context: RunContext,
  stoppedBy: string | undefined
): RunSource {
  const source: RunSource = {
    ...context.run.snapshot.source,
    metadata: [...context.run.snapshot.source.metadata],
  }

  if (stoppedBy !== undefined) {
    source.stop = { actor: { type: "user", label: stoppedBy } }
  }

  return source
}

export function sourceSearchText(source: RunSource) {
  return [
    source.type,
    source.kind?.type,
    source.kind?.label,
    source.event?.type,
    source.event?.label,
    source.surface?.type,
    source.surface?.label,
    source.stop?.actor.label,
    ...source.metadata.flatMap((item) => [item.type, item.label]),
  ]
    .filter(Boolean)
    .join(" ")
}
