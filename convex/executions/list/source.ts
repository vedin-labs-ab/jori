import { type SourceMetadataItem } from "../../sources/schema"
import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type ExecutionSource = {
  type: "automation" | "event" | "manual" | "message"
  event?: SourceDatum
  kind?: SourceDatum
  metadata: SourceMetadataItem[]
  provider?: SourceDatum
  stop?: {
    actor: SourceDatum
  }
}

export function executionSource(
  context: ExecutionContext,
  stoppedBy: string | undefined
): ExecutionSource {
  const source: ExecutionSource = {
    ...context.run.display.source,
    metadata: [...context.run.display.source.metadata],
  }

  if (stoppedBy !== undefined) {
    source.stop = { actor: { type: "user", label: stoppedBy } }
  }

  return source
}

export function sourceSearchText(source: ExecutionSource) {
  return [
    source.type,
    source.kind?.type,
    source.kind?.label,
    source.event?.type,
    source.event?.label,
    source.provider?.type,
    source.provider?.label,
    source.stop?.actor.label,
    ...source.metadata.flatMap((item) => [item.type, item.label]),
  ]
    .filter(Boolean)
    .join(" ")
}
