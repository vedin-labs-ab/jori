import { type Doc } from "../../_generated/dataModel"
import { getToolPermission } from "../../permissions/catalog"
import { providerLabel } from "../../providers/catalog"
import { getActorDisplayName } from "../../shared/actor"
import {
  compactDetails,
  detail,
  type ExecutionDetail,
  type ExecutionDetailGroup,
  type ExecutionDetailType,
  uniqueDetails,
} from "./detail"
import { originDetails } from "./origin"
import { type ExecutionSource } from "./source"

type AutomationAccessSummary = {
  surfaces: Array<{
    provider: string
    tools: string[]
  }>
  webSearch: boolean
}

export function executionDetailSummary(input: {
  automation: Doc<"automations"> | null
  automationAccess?: AutomationAccessSummary
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
      ...visibleOriginDetails,
      ...metadataDetails(input.source.metadata),
    ]),
    taskSource,
  }
}

function timeAutomationDetails(input: {
  automation: Doc<"automations"> | null
  automationAccess?: AutomationAccessSummary
  run: Doc<"runs">
}) {
  if (input.run.reason.type !== "time" || input.automation === null) {
    return []
  }

  if (input.automation.trigger.type === "cron") {
    return recurringAutomationDetails({
      automationAccess: input.automationAccess,
      status: input.automation.status,
      trigger: input.automation.trigger,
    })
  }

  if (input.automation.trigger.type !== "once") {
    return []
  }

  return accessDetails(input.automationAccess)
}

function recurringAutomationDetails(input: {
  automationAccess?: AutomationAccessSummary
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
    ...accessDetails(input.automationAccess),
  ])
}

function accessDetails(automationAccess: AutomationAccessSummary | undefined) {
  const tools = toolsDetail(automationAccess?.surfaces)

  return compactDetails([
    tools === undefined
      ? undefined
      : detail("tools", tools.label, { groups: tools.groups }),
    detail(
      "web_search",
      automationAccess?.webSearch === true ? "Allowed" : "Blocked"
    ),
  ])
}

function automationStatusLabel(status: Doc<"automations">["status"]) {
  if (status === "paused") {
    return "Paused"
  }

  return status === "completed" ? "Completed" : undefined
}

function toolsDetail(
  surfaces: AutomationAccessSummary["surfaces"] | undefined
) {
  const groups = toolGroups(surfaces)

  if (groups === undefined) {
    return undefined
  }

  return {
    groups,
    label: groups
      .map((group) => `${group.label} · ${group.values.join(", ")}`)
      .join(" · "),
  }
}

function toolGroups(surfaces: AutomationAccessSummary["surfaces"] | undefined) {
  if (surfaces === undefined || surfaces.length === 0) {
    return undefined
  }

  const groups = surfaces
    .map((surface) => {
      const values = surface.tools.map(toolLabel).filter(isPresent)

      return values.length === 0
        ? undefined
        : ({
            type: surface.provider,
            label: providerLabel(surface.provider),
            values,
          } satisfies ExecutionDetailGroup)
    })
    .filter(isPresent)

  return groups.length === 0 ? undefined : groups
}

function toolLabel(tool: string) {
  return getToolPermission(tool)?.label ?? tool
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined
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
