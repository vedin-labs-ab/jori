import { expect, test } from "vitest"
import {
  activityData,
  runDoc,
  runSnapshot,
  traceDoc,
} from "../../../test/convex/console"
import { id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { projectActivity } from "./project"

test("groups tool traces into a safe activity item", () => {
  const items = projectActivity(activityData({ traces: toolTraces() }))
  const item = items.find((candidate) => candidate.kind === "tool")

  expect(item).toMatchObject({
    access: "read",
    description: undefined,
    durationMs: 14,
    metadata: [{ kind: "target", text: "src/app.tsx" }],
    status: "completed",
    title: "Read file",
  })
  expect(item?.details).toEqual(
    expect.arrayContaining([
      { label: "Path", value: "src/app.tsx" },
      { label: "Result", value: "string" },
      { label: "Result length", value: "1200" },
    ])
  )
  expect(JSON.stringify(item)).not.toContain("secret file body")
})

test("keeps in-progress model work visible", () => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          sequence: 99,
          timestamp: 10,
          type: "model.started",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      kind: "model",
      isLive: true,
      status: "running",
      title: "Thinking",
    })
  )
})

test.each([
  {
    status: "queued",
    projected: "pending",
    title: "Agent queued",
    isLive: false,
  },
  {
    status: "running",
    projected: "running",
    title: "Agent running",
    isLive: true,
  },
] as const)("projects $status delegated runs as agents", ({
  status,
  projected,
  title,
  isLive,
}) => {
  const items = projectActivity(
    activityData({
      agents: [
        runDoc({
          _id: id<"runs">("agent-run"),
          parentId: id<"runs">("run"),
          snapshot: runSnapshot("Draft a plan"),
          status,
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      id: "agent-run",
      isLive,
      kind: "agent",
      status: projected,
      title,
    })
  )
})

test("labels approved approvals as approved actions", () => {
  const items = projectActivity(
    activityData({
      approvals: [
        {
          _creationTime: 0,
          _id: id<"approvals">("approval"),
          args: "{}",
          code: "ABC123",
          createdAt: 1000,
          decidedAt: 1400,
          expiresAt: 2000,
          requestedBy: { kind: "self", externalId: "jori" },
          runId: id<"runs">("run"),
          status: "approved",
          summary: "Create the page.",
          surface: "notion",
          organizationId: "organization",
          tool: "notion_create_page",
        } as Doc<"approvals">,
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      kind: "approval",
      status: "approved",
      title: "Action approved",
    })
  )
})

test("marks active waiters as live intervals", () => {
  const items = projectActivity(
    activityData({
      waiters: [
        {
          _creationTime: 1000,
          _id: id<"waiters">("waiter"),
          createdAt: 1000,
          expiresAt: 2000,
          runId: id<"runs">("run"),
          status: "waiting",
          organizationId: "organization",
          updatedAt: 1000,
          eventId: "event",
        } as Doc<"waiters">,
      ],
    })
  )
  const item = items.find((candidate) => candidate.kind === "wait")

  expect(item).toEqual(
    expect.objectContaining({
      id: "waiter",
      isLive: true,
      status: "waiting",
      title: "Waiting for input",
    })
  )
  expect(item?.durationMs).toBeUndefined()
  expect(item?.endedAt).toBeUndefined()
})

function toolTraces() {
  return [
    traceDoc({
      data: {
        tools: {
          groups: [
            {
              label: "Workspace",
              surface: "jori",
              tools: [
                {
                  access: "read",
                  description: "Read a file.",
                  label: "  Read file  ",
                  tool: " read ",
                },
                {
                  access: "write",
                  description:
                    "An empty label must not replace the prepared label.",
                  label: " ",
                  tool: "read",
                },
              ],
            },
          ],
          webSearch: false,
        },
      },
      timestamp: 1,
      type: "run.prepared",
    }),
    traceDoc({
      callId: "call-1",
      data: {
        input: { path: "src/app.tsx" },
        tool: { access: "read", name: " read ", route: "sandbox" },
      },
      timestamp: 10,
      type: "tool.started",
    }),
    traceDoc({
      callId: "call-1",
      data: {
        provider: null,
        result: {
          kind: "string",
          length: 1200,
          preview: "secret file body",
        },
        tool: { access: "read", name: "read", route: "sandbox" },
      },
      timestamp: 24,
      type: "tool.completed",
    }),
  ]
}
