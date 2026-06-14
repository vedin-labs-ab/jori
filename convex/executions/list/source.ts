import { getAutomationEventDefinition } from "../../automations/events"
import { providerLabel } from "../../providers/catalog"
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
  const kind = sourceKind(context)
  const provider = sourceProvider(context)
  const event = sourceEvent(context)
  const source: ExecutionSource = {
    type: sourceType(context),
    metadata: context.event?.metadata ?? context.message?.metadata ?? [],
  }

  if (kind !== undefined) {
    source.kind = kind
  }

  if (provider !== undefined) {
    source.provider = provider
  }

  if (event !== undefined) {
    source.event = event
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

function sourceKind({ run }: ExecutionContext): SourceDatum | undefined {
  if (run.reason.type !== "message") {
    return undefined
  }

  return {
    type: run.reason.kind,
    label: run.reason.kind,
  }
}

function sourceType({ run }: ExecutionContext): ExecutionSource["type"] {
  if (run.automationId !== undefined) {
    return "automation"
  }

  if (run.reason.type === "event") {
    return "event"
  }

  if (run.reason.type === "message") {
    return "message"
  }

  return "manual"
}

function sourceProvider({
  approval,
  event,
  message,
}: ExecutionContext): SourceDatum | undefined {
  const provider = message?.provider ?? event?.provider ?? approval?.provider

  if (provider === undefined) {
    return undefined
  }

  return {
    type: provider,
    label: providerLabel(provider),
  }
}

function sourceEvent({ event }: ExecutionContext) {
  if (event === null) {
    return undefined
  }

  return {
    type: event.type,
    label: eventLabel(event),
  }
}

function eventLabel(event: NonNullable<ExecutionContext["event"]>) {
  return (
    getAutomationEventDefinition(event.provider, event.type)?.label ??
    event.type
  )
}
