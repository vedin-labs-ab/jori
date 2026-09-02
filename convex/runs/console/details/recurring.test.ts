import { expect, test } from "vitest"
import { getToolPermission } from "../../../../contracts/permissions"
import {
  fakeQueryCtx,
  preparedTraceRows,
  recurringDisplay,
} from "../../../../test/convex/console"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Id } from "../../../_generated/dataModel"
import { summarizeRun } from "../summaries"

test("includes recurring job details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 9)
  const nextAt = Date.UTC(2026, 5, 15, 9)
  const run = testRun(
    recurringRun(scheduledAt, {
      context: [{ type: "next", label: "Next", timestamp: nextAt }],
    }),
    {
      createdAt: scheduledAt + 1000,
      endedAt: scheduledAt + 2000,
      preparedTools: slackToolSnapshot(),
    }
  )
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        job: recurringJob({ nextAt }),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.source).toEqual({
    kind: { label: "recurring", type: "recurring" },
    type: "job",
    surface: "jori",
  })
  expect(summary.details).toEqual([
    { type: "schedule", label: "Daily at 09:00 UTC" },
    { type: "next", label: "Next", timestamp: nextAt },
    {
      type: "tools",
      label: "Slack · Read 1 · Write 1",
      groups: [
        {
          type: "slack",
          label: "Slack",
          tools: slackDisplayTools(),
        },
      ],
    },
    { type: "web_search", label: "Allowed" },
  ])
})

test("includes paused recurring job status without next run details", async () => {
  const scheduledAt = Date.UTC(2026, 5, 14, 9)
  const nextAt = Date.UTC(2026, 5, 15, 9)
  const run = testRun(
    recurringRun(scheduledAt, {
      context: [{ type: "status", label: "Paused" }],
    }),
    { createdAt: scheduledAt + 1000, endedAt: scheduledAt + 2000 }
  )
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        job: recurringJob({ nextAt, status: "paused" }),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.details).toContainEqual({
    type: "status",
    label: "Paused",
  })
  expect(summary.details.some((detail) => detail.type === "next")).toBe(false)
})

function recurringRun(
  scheduledAt: number,
  display: Parameters<typeof recurringDisplay>[0]
) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    job: { id: "job" },
    cause: { type: "time", scheduledAt },
    instructions: "Generate a team image.",
    snapshot: {
      title: "Daily image",
      ...recurringDisplay(display),
    },
    createdAt: scheduledAt + 1000,
  }
}

function recurringJob({
  nextAt,
  status = "active",
}: {
  nextAt: number
  status?: "active" | "paused"
}) {
  return {
    _id: "job",
    _creationTime: 0,
    organizationId: "organization",
    name: "Daily image",
    instructions: "Generate a team image.",
    type: "cron",
    trigger: {
      expression: "0 9 * * *",
      nextAt,
      functionId: "scheduled",
    },
    access: {
      integrations: [
        {
          id: "integration",
          tools: ["conversations_add_message", "conversations_history"],
        },
      ],
      web: true,
    },
    status,
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
    firedAt: nextAt,
  }
}

function slackIntegration() {
  return integrationDoc({
    _id: id<"integrations">("integration"),
    integration: "slack",
    externalId: "slack-team",
  })
}

function testRun(
  run: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    status: "completed",
    endedAt: 1000,
    ...run,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1] & { preparedTools?: unknown }
}

function slackToolSnapshot() {
  return {
    groups: [
      {
        surface: "slack",
        label: "Slack",
        tools: slackSnapshotTools(),
      },
    ],
    webSearch: true,
  }
}

function slackSnapshotTools() {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
      tool: "conversations_history",
    },
  ]
}

function slackDisplayTools() {
  return [
    catalogTool("conversations_add_message", "write"),
    catalogTool("conversations_history", "read"),
  ]
}

function catalogTool(tool: string, access: "read" | "write") {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission: ${tool}`)
  }

  return {
    access,
    description: permission.description,
    label: permission.label,
    tool,
  }
}
