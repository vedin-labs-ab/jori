import { render } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
// Keep row assertions independent of production chunk-loading latency.
import "./row/expanded"
import { ExecutionRow } from "./row"
import {
  type ExecutionApproval,
  type ExecutionDetailTool,
  type ExecutionItem,
  type ExecutionOffer,
} from "./types"

export function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow
        execution={item}
        now={1700000001000}
        showScope={true}
        tenantId="tenant"
      />
    </TooltipProvider>
  )
}

export function makeExecution(
  overrides: Partial<ExecutionItem> = {}
): ExecutionItem {
  const approval = overrides.approval ?? overrides.approvals?.[0] ?? null
  const offer = overrides.offer ?? overrides.offers?.[0] ?? null

  return {
    approval,
    approvals: approval === null ? [] : [approval],
    createdAt: 1700000000000,
    details: [],
    durationMs: 1000,
    endedAt: 1700000001000,
    error: undefined,
    id: "execution" as ExecutionItem["id"],
    offer,
    offers: offer === null ? [] : [offer],
    scope: "personal",
    searchableText: "",
    source: { type: "automation", surface: "slack" },
    status: "completed",
    task: "Handle the requested actions.",
    title: "Execution test",
    trigger: "Slack event",
    waiter: null,
    ...overrides,
  }
}

export function makeApproval(
  overrides: Partial<ExecutionApproval> = {}
): ExecutionApproval {
  return {
    decidedAt: 1700000001000,
    delivery: undefined,
    expiresAt: 1700001800000,
    id: "approval" as ExecutionApproval["id"],
    source: undefined,
    state: "approved",
    summary: "Send the requested Slack update.",
    surface: "slack",
    tool: "conversations_add_message",
    toolLabel: "Send Slack message",
    ...overrides,
  }
}

export function makeOffer(
  overrides: Partial<ExecutionOffer> = {}
): ExecutionOffer {
  return {
    delivery: undefined,
    expiresAt: 1700001800000,
    id: "offer" as ExecutionOffer["id"],
    integration: "notion",
    integrationLabel: "Notion",
    result: undefined,
    state: "pending",
    summary: "Connect Notion so Milo can create the requested page.",
    updatedAt: 1700000001000,
    ...overrides,
  }
}

export function slackTools(): ExecutionDetailTool[] {
  return [
    {
      access: "write",
      description: "Post a Slack message.",
      label: "Send message",
      tool: "conversations_add_message",
    },
    {
      access: "read",
      description: "Read Slack channel messages.",
      label: "Read channel history",
      tool: "conversations_history",
    },
  ]
}

export function slackToolsDetail(): ExecutionItem["details"][number] {
  return {
    type: "tools",
    label: "Slack · Read 1 · Write 1",
    groups: [
      {
        type: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
  }
}
