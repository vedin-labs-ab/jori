import { getToolPermission } from "@contracts/permissions"
import {
  type ActivityItem,
  type ActivityResult,
} from "@/shared/console/runs/activity/types"

// A run's log as a list of steps laid end to end, in the vocabulary the
// console's own projection uses: the run starts, the model thinks and
// selects actions, tools run against named targets, and the run ends one
// way or another, or is still going.

export type Step =
  | { kind: "start" }
  | {
      kind: "think"
      ms: number
      input: number
      output: number
      actions: number
    }
  | {
      kind: "tool"
      tool: string
      ms: number
      target?: string
      outcome?: string
    }
  | {
      kind: "approval"
      summary: string
      toolLabel: string
      surface: NonNullable<ActivityItem["surface"]>
    }
  | { kind: "live" }
  | { kind: "end"; status: "completed" | "failed" | "stopped"; note?: string }

/** The gap between one step ending and the next beginning. */
const stepGap = 400

export function log(
  startedAt: number,
  runKey: string,
  steps: Step[]
): ActivityResult {
  const items: ActivityItem[] = []
  let at = startedAt

  for (const [index, step] of steps.entries()) {
    const item = stepItem(step, `${runKey}:${index}`, at)

    items.push(item)
    at = (item.endedAt ?? item.startedAt) + stepGap
  }

  return { items, status: "loaded" }
}

export function reminders(customers: string[]): Step[] {
  return customers.map((customer) => ({
    kind: "tool",
    tool: "conversations_add_message",
    ms: 600,
    target: "#finance",
    outcome: `${customer} reminded`,
  }))
}

export function updates(count: number): Step[] {
  return Array.from({ length: count }, () => ({
    kind: "tool",
    tool: "update_table_row",
    ms: 300,
    target: "Customer renewals",
    outcome: "1 row updated",
  }))
}

function stepItem(step: Step, id: string, at: number): ActivityItem {
  switch (step.kind) {
    case "start":
      return {
        id,
        kind: "run",
        status: "running",
        title: "Run started",
        startedAt: at,
      }
    case "think":
      return thought(step, id, at)
    case "tool":
      return toolItem(step, id, at)
    case "approval":
      return {
        id,
        kind: "approval",
        status: "pending",
        title: "Waiting for approval",
        description: step.summary,
        startedAt: at,
        surface: step.surface,
        toolLabel: step.toolLabel,
        isLive: true,
      }
    case "live":
      return {
        id,
        kind: "model",
        status: "running",
        title: "Thinking",
        startedAt: at,
        isLive: true,
      }
    case "end":
      return {
        id,
        kind: "run",
        status: step.status,
        title: `Run ${step.status}`,
        description: step.note,
        startedAt: at,
      }
  }
}

function thought(
  step: Extract<Step, { kind: "think" }>,
  id: string,
  at: number
): ActivityItem {
  return {
    id,
    kind: "model",
    status: "completed",
    title: "Model step completed",
    description:
      step.actions === 0
        ? "Returned control without an action."
        : step.actions === 1
          ? "Selected 1 action."
          : `Selected ${step.actions} actions.`,
    durationMs: step.ms,
    endedAt: at + step.ms,
    startedAt: at,
    tokenUsage: {
      input: step.input,
      output: step.output,
      reasoning: 0,
      total: step.input + step.output,
    },
  }
}

function toolItem(
  step: Extract<Step, { kind: "tool" }>,
  id: string,
  at: number
): ActivityItem {
  const permission = getToolPermission(step.tool)
  const metadata = [
    ...(step.target === undefined
      ? []
      : [{ kind: "target" as const, text: step.target }]),
    ...(step.outcome === undefined
      ? []
      : [{ kind: "outcome" as const, text: step.outcome }]),
  ]

  return {
    id,
    kind: "tool",
    status: "completed",
    title: permission?.label ?? step.tool,
    access: permission?.access,
    durationMs: step.ms,
    endedAt: at + step.ms,
    metadata: metadata.length === 0 ? undefined : metadata,
    startedAt: at,
    tool: step.tool,
  }
}
