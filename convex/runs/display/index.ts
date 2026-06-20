import { type Infer } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { getAutomationEventDefinition } from "../../automations/events"
import { toolSurfaceLabel } from "../../shared/integrations"
import { createSourceMetadata } from "../../shared/sources/metadata"
import { type SourceMetadataItem } from "../../shared/sources/schema"
import { type runSnapshot } from "../schema"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  uniqueDetails,
} from "./detail"
import { originDetails } from "./origin"
import { cronScheduleLabel } from "./schedule"

type RunSnapshot = Infer<typeof runSnapshot>
type RunSnapshotBody = Omit<RunSnapshot, "title">

export function automationDisplay(input: {
  automation: Doc<"automations">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshotBody {
  if (input.automation.type === "event") {
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
}): RunSnapshotBody {
  const metadata = createSourceMetadata({
    data: input.message.data,
    event: input.message.type,
    integration: input.message.integration,
  })
  const details = sourceDetails({
    data: input.message.data,
    integration: input.integration,
    integrationKey: input.message.integration,
    metadata,
    text: input.message.text,
  })
  const taskSource = taskSourceFrom(details)

  return {
    source: {
      type: "message",
      kind: { type: input.kind, label: input.kind },
      surface: {
        type: input.message.integration,
        label: toolSurfaceLabel(input.message.integration),
      },
      metadata,
    },
    trigger: `${toolSurfaceLabel(input.message.integration)} message`,
    details: details.filter((item) => !isPayloadDetail(item)),
    ...(taskSource === undefined ? {} : { taskSource }),
  }
}

function eventAutomationDisplay(input: {
  event: Doc<"events"> | null
  integration: Doc<"integrations"> | null
}): RunSnapshotBody {
  const event = input.event
  const integration = event?.integration

  return {
    source: {
      type: "automation",
      metadata: event?.metadata ?? [],
      ...(integration === undefined
        ? {}
        : {
            surface: {
              type: integration,
              label: toolSurfaceLabel(integration),
            },
          }),
      ...(event === null
        ? {}
        : { event: { type: event.type, label: eventLabel(event) } }),
    },
    trigger:
      integration === undefined
        ? "Event automation"
        : `${toolSurfaceLabel(integration)} event`,
    details:
      event === null
        ? []
        : sourceDetails({
            data: event.data,
            integration: input.integration,
            integrationKey: integration,
            metadata: event.metadata,
            text: event.text,
          }),
  }
}

function timeAutomationDisplay(
  automation: Doc<"automations">
): RunSnapshotBody {
  const trigger = automation.trigger
  const isRecurring = automation.type === "cron" && "expression" in trigger

  return {
    source: {
      type: "automation",
      surface: { type: "milo", label: "Milo" },
      kind: {
        type: isRecurring ? "recurring" : "one-shot",
        label: isRecurring ? "recurring" : "one-shot",
      },
      metadata: isRecurring
        ? [{ type: "schedule", label: cronScheduleLabel(trigger.expression) }]
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
  integrationKey: string | undefined
  metadata: SourceMetadataItem[]
  text: string | undefined
}) {
  return uniqueDetails([
    ...originDetails(input),
    ...metadataDetails(input.metadata),
  ]).map(toRunDisplayDetail)
}

function recurringAutomationDetails(input: {
  status: Doc<"automations">["status"]
  trigger: Extract<Doc<"automations">["trigger"], { nextAt: number }>
}) {
  return compactDetails([
    input.status === "active"
      ? detail("next", "Next", { timestamp: input.trigger.nextAt })
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
    getAutomationEventDefinition(event.integration, event.type)?.label ??
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
    ...(detail.timestamp === undefined ? {} : { timestamp: detail.timestamp }),
  }
}
