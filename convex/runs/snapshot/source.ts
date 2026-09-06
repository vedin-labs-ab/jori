import { type Doc } from "../../_generated/dataModel"
import { type ResolvedContext } from "../../messages/references"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  type ExecutionDetailType,
  uniqueDetails,
} from "../detail"
import {
  type MessageCauseKind,
  type RunSnapshot,
  runSnapshotContextTypes,
} from "../schema"
import { createSourceMetadata, type SourceMetadataItem } from "./metadata"
import { originDetails } from "./origin"
import { cronScheduleLabel } from "./schedule"

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

export function jobSnapshotBody(input: {
  job: Doc<"jobs">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshotBody {
  if (input.job.type === "event") {
    return eventJobDisplay({
      event: input.event ?? null,
      integration: input.integration ?? null,
    })
  }

  return timeJobDisplay(input.job)
}

// A console message is Jori's own surface: nothing to link back to and no
// provider context to describe, so its source reads as Jori, and its one
// chip is what the conversation was opened about, when it was.
export function messageSnapshotBody(input: {
  context?: ResolvedContext
  integration: Doc<"integrations"> | null
  kind: MessageCauseKind
  message: Doc<"messages">
}): RunSnapshotBody {
  if (input.message.surface === "console") {
    return {
      source: { type: "message", surface: "jori" },
      context: consoleContext(input.context),
    }
  }

  const metadata = createSourceMetadata({
    data: input.message.data,
    event: input.message.type,
    integration: input.message.surface,
  })
  const details = snapshotContext({
    data: input.message.data,
    integration: input.integration,
    integrationKey: input.message.surface,
    metadata,
    text: input.message.text,
  })
  const sourceUrl = sourceUrlFrom(details)

  return {
    source: {
      type: "message",
      surface: input.message.surface,
      ...(sourceUrl === undefined ? {} : { url: sourceUrl }),
    },
    context: details.filter((item) => !isPayloadDetail(item)),
  }
}

/** The chip for a chat's context: the folder or the filed resource by its
 *  name. A run has no chip of its own; the Activity page is where it is. */
function consoleContext(context: ResolvedContext | undefined) {
  return context === undefined || context.kind === "run"
    ? []
    : compactDetails([detail(context.kind, context.name)]).flatMap(
        toSnapshotContext
      )
}

function eventJobDisplay(input: {
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
      type: "job",
      ...(integration === undefined ? {} : { surface: integration }),
      ...(sourceUrl === undefined ? {} : { url: sourceUrl }),
    },
    context: context.filter((item) => !isPayloadDetail(item)),
  }
}

function timeJobDisplay(job: Doc<"jobs">): RunSnapshotBody {
  const trigger = job.trigger
  const isRecurring = job.type === "cron" && "expression" in trigger

  if (!isRecurring) {
    return {
      source: {
        type: "job",
        surface: "jori",
      },
      context: [],
    }
  }

  return {
    source: {
      type: "job",
      surface: "jori",
    },
    context: timeJobContext({
      status: job.status,
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

function timeJobContext(input: {
  status: Doc<"jobs">["status"]
  trigger: Extract<Doc<"jobs">["trigger"], { nextAt: number }>
}) {
  return compactDetails([
    detail("schedule", cronScheduleLabel(input.trigger.expression)),
    input.status === "active"
      ? detail("next", "Next", { timestamp: input.trigger.nextAt })
      : undefined,
    input.status === "active"
      ? undefined
      : detail("status", jobStatusLabel(input.status)),
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

function jobStatusLabel(status: Doc<"jobs">["status"]) {
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
  return (runSnapshotContextTypes as readonly string[]).includes(type)
}
