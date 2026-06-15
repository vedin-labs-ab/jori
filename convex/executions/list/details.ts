import { type Doc } from "../../_generated/dataModel"
import { getActorDisplayName } from "../../shared/actor"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  type ExecutionDetailType,
  uniqueDetails,
} from "./detail"
import { originDetails } from "./origin"
import { type ExecutionSource } from "./source"
import { toolDetails } from "./tools"

export function executionDetailSummary(input: {
  automation: Doc<"automations"> | null
  approval: Doc<"approvals"> | null
  event: Doc<"events"> | null
  execution: Doc<"executions">
  integration: Doc<"integrations"> | null
  message: Doc<"messages"> | null
  run: Doc<"runs">
  source: ExecutionSource
  stoppedBy: string | undefined
}) {
  const origin = input.message ?? input.event
  const originDetailList = originDetails({
    data: origin?.data,
    integration: input.integration,
    provider: origin?.provider,
    text: origin?.text,
  })
  const isMessageKind = messageKind(input.source)
  const taskSource = isMessageKind
    ? taskSourceFrom(originDetailList)
    : undefined
  const visibleOriginDetails = isMessageKind
    ? originDetailList.filter((item) => !isPayloadDetail(item))
    : originDetailList

  return {
    details: uniqueDetails([
      stoppedDetail(input.execution, input.stoppedBy),
      decisionDetail(input.approval),
      ...timeAutomationDetails(input),
      ...toolDetails({
        includeWebSearch: input.run.reason.type === "time",
        snapshot: input.execution.toolSnapshot,
      }),
      ...visibleOriginDetails,
      ...metadataDetails(input.source.metadata),
    ]),
    taskSource,
  }
}

function timeAutomationDetails(input: {
  automation: Doc<"automations"> | null
  run: Doc<"runs">
}) {
  if (
    input.run.reason.type !== "time" ||
    input.automation === null ||
    input.automation.trigger.type !== "cron"
  ) {
    return []
  }

  return recurringAutomationDetails({
    status: input.automation.status,
    trigger: input.automation.trigger,
  })
}

function recurringAutomationDetails(input: {
  status: Doc<"automations">["status"]
  trigger: Extract<Doc<"automations">["trigger"], { type: "cron" }>
}) {
  const trigger = input.trigger

  return compactDetails([
    input.status === "active"
      ? detail("next", "Next", { at: trigger.nextAt })
      : undefined,
    input.status === "active"
      ? undefined
      : detail("status", automationStatusLabel(input.status)),
  ])
}

function automationStatusLabel(status: Doc<"automations">["status"]) {
  if (status === "paused") {
    return "Paused"
  }

  return status === "completed" ? "Completed" : undefined
}

function stoppedDetail(
  execution: Doc<"executions">,
  stoppedBy: string | undefined
) {
  if (execution.status !== "stopped") {
    return undefined
  }

  return detail("stopped", stoppedBy ?? "Stopped", {
    at: execution.stoppedAt ?? execution.finishedAt,
  })
}

function decisionDetail(approval: Doc<"approvals"> | null) {
  if (approval?.decision !== "approved") {
    return undefined
  }

  const decidedBy = getActorDisplayName(approval.decidedBy)

  return decidedBy === undefined
    ? undefined
    : detail("decision", decidedBy, { at: approval.decidedAt })
}

function metadataDetails(metadata: ExecutionSource["metadata"]) {
  return compactDetails(
    metadata
      .filter(isRequestedMetadata)
      .map((item) => detail(item.type, item.label, { url: item.url }))
  )
}

function messageKind(source: ExecutionSource) {
  return (
    source.type === "message" &&
    (source.kind?.type === "mention" || source.kind?.type === "reply")
  )
}

function taskSourceFrom(details: ExecutionDetail[]) {
  const source = details.find(
    (item) => isPayloadDetail(item) && item.url !== undefined
  )

  return source?.url === undefined
    ? undefined
    : { label: "Source", url: source.url }
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function isRequestedMetadata(
  item: ExecutionSource["metadata"][number]
): item is ExecutionSource["metadata"][number] & {
  type: Extract<
    ExecutionDetailType,
    "channel" | "issue" | "page" | "pull_request" | "repository"
  >
} {
  return (
    item.type === "channel" ||
    item.type === "issue" ||
    item.type === "page" ||
    item.type === "pull_request" ||
    item.type === "repository"
  )
}
