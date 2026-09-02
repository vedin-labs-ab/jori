import {
  getJobEventDefinition,
  isJobEventIntegration,
} from "../../../contracts/jobs/events"
import { type Doc } from "../../_generated/dataModel"
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
  parent?: {
    title?: string
  }
  surface?: ToolSurface
  trigger?: {
    actor?: SourceDatum
  }
  stop?: {
    actor: SourceDatum
  }
  url?: string
}

/**
 * A run a person kicked off by hand ("Try once" / "Run now"), as opposed to a
 * scheduled, event, or agent-spawned run. Its schedule and status describe the
 * automation, not this run, so the projection drops them.
 */
export function isManualTrigger(run: Doc<"runs">) {
  return run.cause.type === "manual" && run.parentId === undefined
}

/** A run Jori spawned from another run to work a delegated subtask. */
export function isSubtaskRun(run: Doc<"runs">) {
  return run.parentId !== undefined
}

export function runSource(
  context: RunContext,
  stoppedBy: string | undefined,
  triggeredBy: string | undefined
): RunSource {
  const source: RunSource = {
    ...context.run.snapshot.source,
    ...sourceContext(context),
  }

  if (isManualTrigger(context.run)) {
    source.surface = "jori"
    source.trigger =
      triggeredBy === undefined
        ? {}
        : { actor: { type: "user", label: triggeredBy } }
  }

  if (isSubtaskRun(context.run)) {
    source.surface = "jori"
    source.parent =
      context.parent === null ? {} : { title: context.parent.snapshot.title }
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
    source.parent === undefined ? undefined : "subtask",
    source.parent?.title,
    source.trigger === undefined ? undefined : "manually triggered",
    source.trigger?.actor?.label,
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

  return context.automation?.type === "once" ||
    context.run.automation?.parentId !== undefined
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
  return surface === undefined || !isJobEventIntegration(surface)
    ? type
    : (getJobEventDefinition(surface, type)?.label ?? type)
}

function datum(type: string, label: string): SourceDatum {
  return { type, label }
}

function optionalDatum(key: "event" | "kind", value: SourceDatum | undefined) {
  return value === undefined ? {} : { [key]: value }
}
