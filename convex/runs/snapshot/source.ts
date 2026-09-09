import { type Doc } from "../../_generated/dataModel"
import { type ResolvedContext } from "../../messages/references"
import { type Integration } from "../../shared/integrations"
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
import { createSourceMetadata } from "./metadata"
import { originDetails } from "./origin"
import { cronScheduleLabel } from "./schedule"

type RunSnapshotBody = Omit<RunSnapshot, "title">
type SnapshotContext = RunSnapshot["context"][number]
type SnapshotContextType = SnapshotContext["type"]

export function jobSnapshotBody(input: {
  job: Doc<"jobs">
  event?: Doc<"events"> | null
  integration?: Doc<"integrations"> | null
}): RunSnapshotBody {
  if (input.job.type === "event") {
    const surface = input.integration?.integration

    return providerSnapshotBody({
      source: { type: "job", ...(surface === undefined ? {} : { surface }) },
      content: input.event ?? null,
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

  return providerSnapshotBody({
    source: { type: "message", surface: input.message.surface },
    content: input.message,
    integration: input.integration,
  })
}

/** The chip for a chat's context: the folder or the filed resource by its
 *  name. A run and a chat have no chip of their own; the Activity page and
 *  the chat itself are where they are. */
function consoleContext(context: ResolvedContext | undefined) {
  return context === undefined ||
    context.kind === "run" ||
    context.kind === "chat"
    ? []
    : compactDetails([detail(context.kind, context.name)]).flatMap(
        toSnapshotContext
      )
}

function providerSnapshotBody(input: {
  source: { type: "job" | "message"; surface?: Integration }
  content: { data?: unknown; text?: string } | null
  integration: Doc<"integrations"> | null
}): RunSnapshotBody {
  const { content, source, integration } = input
  if (content === null) {
    return { source, context: [] }
  }

  const details = uniqueDetails([
    ...originDetails({
      data: content.data,
      text: content.text,
      integration,
      integrationKey: source.surface,
    }),
    ...(source.surface === undefined
      ? []
      : createSourceMetadata({
          data: content.data,
          integration: source.surface,
        })),
  ]).flatMap(toSnapshotContext)
  const sourceUrl = sourceUrlFrom(details)

  return {
    source: {
      ...source,
      ...(sourceUrl === undefined ? {} : { url: sourceUrl }),
    },
    context: details.filter((item) => !isPayloadDetail(item)),
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
