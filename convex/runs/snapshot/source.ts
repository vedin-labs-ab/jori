import { type Infer } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  type ExecutionDetailType,
  uniqueDetails,
} from "../detail"
import { type MessageCauseKind, type runSnapshot } from "../schema"
import { createSourceMetadata, type SourceMetadataItem } from "./metadata"
import { originDetails } from "./origin"
import { cronScheduleLabel } from "./schedule"

type RunSnapshot = Infer<typeof runSnapshot>
type RunSnapshotBody = Omit<RunSnapshot, "title">
type SnapshotContext = RunSnapshot["context"][number]
type SnapshotContextType = SnapshotContext["type"]
type SourceContextMetadataType =
  | "channel"
  | "event"
  | "file"
  | "folder"
  | "issue"
  | "page"
  | "project"
  | "pull_request"
  | "repository"
  | "sender"
  | "subject"

export function automationSnapshotBody(input: {
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

export function messageSnapshotBody(input: {
  integration: Doc<"integrations">
  kind: MessageCauseKind
  message: Doc<"messages">
}): RunSnapshotBody {
  const metadata = createSourceMetadata({
    data: input.message.data,
    event: input.message.type,
    integration: input.message.integration,
  })
  const details = snapshotContext({
    data: input.message.data,
    integration: input.integration,
    integrationKey: input.message.integration,
    metadata,
    text: input.message.text,
  })
  const sourceUrl = sourceUrlFrom(details)

  return {
    source: {
      type: "message",
      surface: input.message.integration,
      ...(sourceUrl === undefined ? {} : { url: sourceUrl }),
    },
    context: details.filter((item) => !isPayloadDetail(item)),
  }
}

function eventAutomationDisplay(input: {
  event: Doc<"events"> | null
  integration: Doc<"integrations"> | null
}): RunSnapshotBody {
  const event = input.event
  const integration = input.integration?.integration
  const metadata =
    event === null || integration === undefined
      ? []
      : createSourceMetadata({
          data: event.data,
          event: event.type,
          integration,
        })
  const context =
    event === null
      ? []
      : snapshotContext({
          data: event.data,
          integration: input.integration,
          integrationKey: integration,
          metadata,
          text: event.text,
        })
  const sourceUrl = sourceUrlFrom(context)

  return {
    source: {
      type: "automation",
      ...(integration === undefined ? {} : { surface: integration }),
      ...(sourceUrl === undefined ? {} : { url: sourceUrl }),
    },
    context: context.filter((item) => !isPayloadDetail(item)),
  }
}

function timeAutomationDisplay(
  automation: Doc<"automations">
): RunSnapshotBody {
  const trigger = automation.trigger
  const isRecurring = automation.type === "cron" && "expression" in trigger

  if (!isRecurring) {
    return {
      source: {
        type: "automation",
        surface: "milo",
      },
      context: [],
    }
  }

  return {
    source: {
      type: "automation",
      surface: "milo",
    },
    context: timeAutomationContext({
      status: automation.status,
      trigger,
    }),
  }
}

function snapshotContext(input: {
  data: unknown
  integration: Doc<"integrations"> | null
  integrationKey: string | undefined
  metadata: SourceMetadataItem[]
  text: string | undefined
}) {
  return uniqueDetails([
    ...originDetails(input),
    ...sourceMetadataDetails(input.metadata),
  ]).flatMap(toSnapshotContext)
}

function timeAutomationContext(input: {
  status: Doc<"automations">["status"]
  trigger: Extract<Doc<"automations">["trigger"], { nextAt: number }>
}) {
  return compactDetails([
    detail("schedule", cronScheduleLabel(input.trigger.expression)),
    input.status === "active"
      ? detail("next", "Next", { timestamp: input.trigger.nextAt })
      : undefined,
    input.status === "active"
      ? undefined
      : detail("status", automationStatusLabel(input.status)),
  ]).flatMap(toSnapshotContext)
}

function sourceMetadataDetails(metadata: SourceMetadataItem[]) {
  return compactDetails(
    metadata
      .filter(isRequestedMetadata)
      .map((item) =>
        detail(metadataType(item.type), item.label, { url: item.url })
      )
  )
}

function automationStatusLabel(status: Doc<"automations">["status"]) {
  if (status === "paused") {
    return "Paused"
  }

  return status === "completed" ? "Completed" : undefined
}

function sourceUrlFrom(details: ExecutionDetail[]) {
  const source = details.find(
    (item) => isPayloadDetail(item) && item.url !== undefined
  )

  return source?.url
}

function isPayloadDetail(detail: Pick<ExecutionDetail, "type">) {
  return detail.type === "comment" || detail.type === "message"
}

function isRequestedMetadata(
  item: SourceMetadataItem
): item is SourceMetadataItem & {
  type: SourceContextMetadataType
} {
  return (
    item.type === "channel" ||
    item.type === "event" ||
    item.type === "file" ||
    item.type === "folder" ||
    item.type === "issue" ||
    item.type === "page" ||
    item.type === "project" ||
    item.type === "pull_request" ||
    item.type === "repository" ||
    item.type === "sender" ||
    item.type === "subject"
  )
}

function metadataType(type: SourceContextMetadataType): ExecutionDetailType {
  return type === "event" ? "calendar_event" : type
}

function toSnapshotContext(detail: ExecutionDetail): SnapshotContext[] {
  if (!isSnapshotContextType(detail.type)) {
    return []
  }

  return [
    {
      type: detail.type,
      label: detail.label,
      ...(detail.url === undefined ? {} : { url: detail.url }),
      ...(detail.timestamp === undefined
        ? {}
        : { timestamp: detail.timestamp }),
    },
  ]
}

function isSnapshotContextType(
  type: ExecutionDetailType
): type is SnapshotContextType {
  return (
    type === "calendar_event" ||
    type === "channel" ||
    type === "comment" ||
    type === "email" ||
    type === "file" ||
    type === "folder" ||
    type === "issue" ||
    type === "message" ||
    type === "next" ||
    type === "page" ||
    type === "project" ||
    type === "pull_request" ||
    type === "repository" ||
    type === "schedule" ||
    type === "sender" ||
    type === "status" ||
    type === "subject"
  )
}
