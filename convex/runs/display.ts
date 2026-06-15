import { type Infer } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { getAutomationEventDefinition } from "../automations/events"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  uniqueDetails,
} from "../executions/list/detail"
import { originDetails } from "../executions/list/origin"
import { cronScheduleLabel } from "../executions/list/schedule"
import { providerLabel } from "../providers/catalog"
import { type SourceMetadataItem } from "../sources/schema"
import { type runDisplay } from "./schema"

type RunDisplay = Infer<typeof runDisplay>

export function automationDisplay(input: {
  automation: Doc<"automations">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunDisplay {
  if (input.automation.trigger.type === "event") {
    return eventAutomationDisplay({
      event: input.event ?? null,
      integration: input.integration ?? null,
    })
  }

  return timeAutomationDisplay(input.automation)
}

export function messageDisplay(input: {
  integration: Doc<"integrations">
  kind: "mention" | "reply"
  message: Doc<"messages">
}): RunDisplay {
  const details = sourceDetails({
    data: input.message.data,
    integration: input.integration,
    metadata: input.message.metadata,
    provider: input.message.provider,
    text: input.message.text,
  })
  const taskSource = taskSourceFrom(details)

  return {
    source: {
      type: "message",
      kind: { type: input.kind, label: input.kind },
      provider: {
        type: input.message.provider,
        label: providerLabel(input.message.provider),
      },
      metadata: input.message.metadata,
    },
    trigger: `${providerLabel(input.message.provider)} message`,
    details: details.filter((item) => !isPayloadDetail(item)),
    ...(taskSource === undefined ? {} : { taskSource }),
  }
}

function eventAutomationDisplay(input: {
  event: Doc<"events"> | null
  integration: Doc<"integrations"> | null
}): RunDisplay {
  const event = input.event
  const provider = event?.provider

  return {
    source: {
      type: "automation",
      metadata: event?.metadata ?? [],
      ...(provider === undefined
        ? {}
        : { provider: { type: provider, label: providerLabel(provider) } }),
      ...(event === null
        ? {}
        : { event: { type: event.type, label: eventLabel(event) } }),
    },
    trigger:
      provider === undefined
        ? "Event automation"
        : `${providerLabel(provider)} event`,
    details:
      event === null
        ? []
        : sourceDetails({
            data: event.data,
            integration: input.integration,
            metadata: event.metadata,
            provider,
            text: event.text,
          }),
  }
}

function timeAutomationDisplay(automation: Doc<"automations">): RunDisplay {
  const trigger = automation.trigger
  const isRecurring = trigger.type === "cron"

  return {
    source: {
      type: "automation",
      provider: { type: "milo", label: "Milo" },
      kind: {
        type: isRecurring ? "recurring" : "one-shot",
        label: isRecurring ? "recurring" : "one-shot",
      },
      metadata: isRecurring
        ? [{ type: "schedule", label: cronScheduleLabel(trigger.cron) }]
        : [],
    },
    trigger: "Time automation",
    details: isRecurring
      ? recurringAutomationDetails({
          status: automation.status,
          trigger,
        })
      : [],
  }
}

function sourceDetails(input: {
  data: unknown
  integration: Doc<"integrations"> | null
  metadata: SourceMetadataItem[]
  provider: string | undefined
  text: string | undefined
}) {
  return uniqueDetails([
    ...originDetails(input),
    ...metadataDetails(input.metadata),
  ]).map(toRunDisplayDetail)
}

function recurringAutomationDetails(input: {
  status: Doc<"automations">["status"]
  trigger: Extract<Doc<"automations">["trigger"], { type: "cron" }>
}) {
  return compactDetails([
    input.status === "active"
      ? detail("next", "Next", { at: input.trigger.nextAt })
      : undefined,
    input.status === "active"
      ? undefined
      : detail("status", automationStatusLabel(input.status)),
  ]).map(toRunDisplayDetail)
}

function metadataDetails(metadata: SourceMetadataItem[]) {
  return compactDetails(
    metadata
      .filter(isRequestedMetadata)
      .map((item) => detail(item.type, item.label, { url: item.url }))
  )
}

function eventLabel(event: Doc<"events">) {
  return (
    getAutomationEventDefinition(event.provider, event.type)?.label ??
    event.type
  )
}

function automationStatusLabel(status: Doc<"automations">["status"]) {
  if (status === "paused") {
    return "Paused"
  }

  return status === "completed" ? "Completed" : undefined
}

function taskSourceFrom(details: ExecutionDetail[]) {
  const source = details.find(
    (item) => isPayloadDetail(item) && item.url !== undefined
  )

  return source?.url === undefined
    ? undefined
    : { label: "Source", url: source.url }
}

function isPayloadDetail(detail: Pick<ExecutionDetail, "type">) {
  return detail.type === "comment" || detail.type === "message"
}

function isRequestedMetadata(
  item: SourceMetadataItem
): item is SourceMetadataItem & {
  type: "channel" | "issue" | "page" | "pull_request" | "repository"
} {
  return (
    item.type === "channel" ||
    item.type === "issue" ||
    item.type === "page" ||
    item.type === "pull_request" ||
    item.type === "repository"
  )
}

function toRunDisplayDetail(detail: ExecutionDetail) {
  return {
    type: detail.type,
    label: detail.label,
    ...(detail.url === undefined ? {} : { url: detail.url }),
    ...(detail.at === undefined ? {} : { at: detail.at }),
  }
}
