import { type Doc } from "../../_generated/dataModel"
import { getAutomationEventDefinition } from "../../automations/events"
import { providerLabel } from "../../providers/catalog"
import { type Actor } from "../../shared/actor"
import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export function executionTitle(context: ExecutionContext) {
  return context.approval?.handoff.objective ?? context.run?.title ?? "Run"
}

export function executionInstructions(context: ExecutionContext) {
  return context.run?.instructions
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
  event,
  integration,
  message,
  run,
}: ExecutionContext) {
  const automationName = run?.automationId === undefined ? undefined : run.title

  if (automationName !== undefined) {
    if (run?.reason.type === "event") {
      return eventSourceLabels({ automationName, event, integration })
    }

    return ["Triggered by automation:", automationName]
  }

  if (run?.reason.type === "event") {
    return eventSourceLabels({ event, integration })
  }

  if (run?.reason.type === "message" && message === null) {
    return ["Triggered by message"]
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
