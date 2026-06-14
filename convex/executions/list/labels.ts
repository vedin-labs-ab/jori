import { type Doc } from "../../_generated/dataModel"
import { getAutomationEventDefinition } from "../../automations/events"
import { providerLabel } from "../../providers/catalog"
import { type Actor } from "../../shared/actor"
import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export function executionTitle(context: ExecutionContext) {
  return (
    context.approval?.handoff.objective ??
    context.automation?.name ??
    automationNameSnapshot(context.run) ??
    eventTitle(context) ??
    firstLine(context.message?.text) ??
    titleFromRun(context.run)
  )
}

export function executionInstructions(context: ExecutionContext) {
  if (context.run?.reason.type === "message") {
    return normalizedText(context.message?.text)
  }

  if (context.run?.automationId !== undefined) {
    return (
      runDataString(context.run, "automationInstructions") ??
      normalizedText(context.automation?.instructions)
    )
  }

  return undefined
}

export function executionSourceParts(
  context: ExecutionContext,
  stoppedBy: string | undefined
) {
  const parts = sourceLabels(context)

  if (stoppedBy === undefined) {
    return parts
  }

  return [...parts, `Stopped by ${stoppedBy}`]
}

export function triggerLabel(context: ExecutionContext) {
  const run = context.run

  if (run?.reason.type === "time") {
    return "Time automation"
  }

  if (run?.reason.type === "event") {
    return `${providerLabel(context.integration?.provider)} event`
  }

  if (run?.reason.type === "message") {
    return `${providerLabel(context.integration?.provider)} message`
  }

  return "Manual run"
}

function sourceLabels({
  approval,
  automation,
  event,
  integration,
  message,
  run,
}: ExecutionContext) {
  const automationName = automation?.name ?? automationNameSnapshot(run)

  if (automationName !== undefined) {
    if (run?.reason.type === "event") {
      return eventSourceLabels({ automationName, event, integration })
    }

    return ["Triggered by automation:", automationName]
  }

  if (run?.reason.type === "event") {
    return eventSourceLabels({ event, integration })
  }

  if (message !== null) {
    const provider = providerLabel(integration?.provider)

    return ["Triggered by", actorLabel(message.actor), "in", provider].filter(
      (part): part is string => part !== undefined && part !== ""
    )
  }

  if (approval !== null) {
    const provider = providerLabel(approval.provider)

    return [
      "Triggered by",
      actorLabel(approval.requestedBy),
      "in",
      provider,
    ].filter((part): part is string => part !== undefined && part !== "")
  }

  return ["Manual run"]
}

function eventSourceLabels({
  automationName,
  event,
  integration,
}: {
  automationName?: string
  event: Doc<"events"> | null
  integration: Doc<"integrations"> | null
}) {
  const provider =
    integration === null ? undefined : providerLabel(integration.provider)
  const actor =
    provider === undefined || event?.actor === undefined
      ? undefined
      : actorLabel(event.actor)

  return [
    "Triggered by event:",
    ...(actor === undefined ? [] : [actor, "in"]),
    provider,
    "event:",
    eventLabel(event, integration),
    ...(automationName === undefined
      ? []
      : ["for automation:", automationName]),
  ].filter((part): part is string => part !== undefined && part !== "")
}

function eventTitle({ event, integration, run }: ExecutionContext) {
  if (run?.reason.type !== "event" || event === null) {
    return undefined
  }

  return firstLine(event.text) ?? eventLabel(event, integration)
}

function eventLabel(
  event: Doc<"events"> | null,
  integration: Doc<"integrations"> | null
) {
  if (event === null) {
    return "Provider event"
  }

  if (integration === null) {
    return event.type
  }

  return (
    getAutomationEventDefinition(integration.provider, event.type)?.label ??
    event.type
  )
}

function automationNameSnapshot(run: Doc<"runs"> | null) {
  return runDataString(run, "automationName")
}

function runDataString(run: Doc<"runs"> | null, key: string) {
  const data = run?.data

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return undefined
  }

  const value = data[key]

  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

function normalizedText(text: string | undefined) {
  const value = text?.trim()

  return value === "" ? undefined : value
}

function titleFromRun(run: Doc<"runs"> | null) {
  if (run?.reason.type === "time") {
    return "Timed automation"
  }

  if (run?.reason.type === "event") {
    return "Event automation"
  }

  if (run?.reason.type === "message") {
    return "Message run"
  }

  return "Manual run"
}

function actorLabel(actor: Actor | undefined) {
  if (actor === undefined) {
    return "someone"
  }

  if ("email" in actor && actor.email !== undefined) {
    return actor.email
  }

  if ("userId" in actor) {
    return actor.name ?? actor.email ?? "a user"
  }

  return "provider" in actor ? actor.externalId : undefined
}

function firstLine(text: string | undefined) {
  const line = text?.trim().split("\n").find(Boolean)

  if (line === undefined) {
    return undefined
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}
