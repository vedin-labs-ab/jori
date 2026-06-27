import {
  getAutomationEventDefinition,
  isAutomationEventIntegration,
} from "../../automations/events"
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
  event?: SourceDatum
  kind?: SourceDatum
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
    ...sourceContext(context),
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
    source.surface,
    source.url,
    source.stop?.actor.label,
  ]
    .filter(Boolean)
    .join(" ")
}

function sourceContext(context: RunContext) {
  return {
    ...optionalDatum("kind", sourceKind(context)),
    ...optionalDatum("event", sourceEvent(context)),
  }
}

function sourceKind(context: RunContext) {
  const cause = context.run.cause

  if (cause.type === "message") {
    return datum(cause.kind, cause.kind)
  }

  if (cause.type !== "time") {
    return undefined
  }

  if (
    context.automation?.type === "cron" ||
    context.run.snapshot.context.some((detail) => detail.type === "schedule")
  ) {
    return datum("recurring", "recurring")
  }

  return context.automation?.type === "once"
    ? datum("one-shot", "one-shot")
    : undefined
}

function sourceEvent(context: RunContext) {
  if (context.run.cause.type !== "event") {
    return undefined
  }

  const type = context.event?.type ?? automationEventType(context)

  return type === undefined
    ? undefined
    : datum(type, sourceEventLabel(context.run.snapshot.source.surface, type))
}

function automationEventType(context: RunContext) {
  const trigger = context.automation?.trigger

  return trigger !== undefined && "event" in trigger ? trigger.event : undefined
}

function sourceEventLabel(surface: ToolSurface | undefined, type: string) {
  return surface === undefined || !isAutomationEventIntegration(surface)
    ? type
    : (getAutomationEventDefinition(surface, type)?.label ?? type)
}

function datum(type: string, label: string): SourceDatum {
  return { type, label }
}

function optionalDatum(key: "event" | "kind", value: SourceDatum | undefined) {
  return value === undefined ? {} : { [key]: value }
}
