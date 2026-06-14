import { type Doc } from "../../_generated/dataModel"
import { getAutomationEventDefinition } from "../../automations/events"
import {
  type IntegrationProvider,
  providerLabel,
} from "../../providers/catalog"
import { type Actor } from "../../shared/actor"
import { type getExecutionContext } from "./context"
import { sourceFacts, sourceTarget } from "./metadata"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type ExecutionSource = {
  type: "automation" | "event" | "manual" | "message"
  actor?: SourceDatum
  automation?: SourceDatum
  event?: SourceDatum
  facts: SourceDatum[]
  provider?: SourceDatum
  stop?: {
    actor: SourceDatum
  }
  target?: SourceDatum
}

export function executionSource(
  context: ExecutionContext,
  stoppedBy: string | undefined
): ExecutionSource {
  const provider = sourceProvider(context)
  const event = sourceEvent(context)
  const data = context.event?.data ?? context.message?.data
  const target = sourceTarget({
    data,
    event: context.event,
    message: context.message,
    provider: provider?.type,
  })
  const source: ExecutionSource = {
    type: sourceType(context),
    facts: sourceFacts(provider?.type, data),
  }
  const automation = sourceAutomation(context.run)
  const actor = actorDatum(
    context.event?.actor ??
      context.message?.actor ??
      context.approval?.requestedBy
  )

  if (automation !== undefined) {
    source.automation = automation
  }

  if (provider !== undefined) {
    source.provider = provider
  }

  if (event !== undefined) {
    source.event = event
  }

  if (actor !== undefined) {
    source.actor = actor
  }

  if (target !== undefined) {
    source.target = target
  }

  if (stoppedBy !== undefined) {
    source.stop = { actor: { type: "user", label: stoppedBy } }
  }

  return source
}

export function sourceSearchText(source: ExecutionSource) {
  return [
    source.type,
    source.actor?.type,
    source.actor?.label,
    source.automation?.label,
    source.event?.type,
    source.event?.label,
    source.provider?.type,
    source.provider?.label,
    source.target?.type,
    source.target?.label,
    source.stop?.actor.label,
    ...source.facts.flatMap((fact) => [fact.type, fact.label]),
  ]
    .filter(Boolean)
    .join(" ")
}

function sourceType({ run }: ExecutionContext): ExecutionSource["type"] {
  if (run?.automationId !== undefined) {
    return "automation"
  }

  if (run?.reason.type === "event") {
    return "event"
  }

  if (run?.reason.type === "message") {
    return "message"
  }

  return "manual"
}

function sourceAutomation(
  run: ExecutionContext["run"]
): SourceDatum | undefined {
  if (run?.automationId === undefined) {
    return undefined
  }

  return {
    type: "automation",
    label: run.title,
  }
}

function sourceProvider({
  approval,
  event,
  integration,
  message,
}: ExecutionContext): SourceDatum | undefined {
  const provider =
    message?.provider ??
    event?.provider ??
    integration?.provider ??
    approval?.provider

  if (provider === undefined) {
    return undefined
  }

  return {
    type: provider,
    label: providerLabel(provider),
  }
}

function sourceEvent({ event, integration }: ExecutionContext) {
  if (event === null) {
    return undefined
  }

  const provider = event.provider ?? integration?.provider

  return {
    type: event.type,
    label: eventLabel(event, provider),
  }
}

function eventLabel(
  event: Doc<"events">,
  provider: IntegrationProvider | undefined
) {
  if (provider === undefined) {
    return event.type
  }

  return getAutomationEventDefinition(provider, event.type)?.label ?? event.type
}

function actorDatum(actor: Actor | undefined): SourceDatum | undefined {
  if (actor === undefined) {
    return undefined
  }

  if ("email" in actor && actor.email !== undefined) {
    return { type: "email", label: actor.email }
  }

  if ("userId" in actor) {
    return {
      type: "user",
      label: actor.name ?? actor.email ?? "User",
    }
  }

  if ("provider" in actor) {
    return {
      type: actor.provider,
      label: actor.email ?? actor.externalId,
    }
  }
}
