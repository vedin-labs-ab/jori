import { expect, test } from "vitest"
import { emptyActivityData } from "../../../test/convex/console"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectActivity } from "./project"
import { type ActivityData } from "./types"

test("does not mark historical run lifecycle events as live", () => {
  const items = projectActivity(
    data({
      traces: [
        trace({
          timestamp: 1,
          type: "run.started",
        }),
        trace({
          timestamp: 20,
          type: "run.completed",
        }),
      ],
    })
  )

  const started = items.find((item) => item.title === "Run started")

  expect(started).toMatchObject({
    kind: "run",
    status: "running",
  })
  expect(started?.isLive).toBeUndefined()
})

test("does not mark stale in-progress traces as live after run completion", () => {
  const items = projectActivity(
    data({
      traces: [
        trace({
          data: {
            input: { command: "pnpm test" },
            tool: { access: "write", name: "bash", route: "sandbox" },
          },
          timestamp: 10,
          type: "tool.started",
        }),
        trace({
          timestamp: 20,
          type: "run.completed",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      isLive: false,
      kind: "tool",
      status: "running",
    })
  )
})

test("projects stopped runs as terminal activity", () => {
  const items = projectActivity(
    data({
      run: run({
        status: "stopped",
        stoppedBy: {
          kind: "person",
          name: "Albin",
          personId: id<"persons">("person"),
        },
      }),
      traces: [
        trace({
          timestamp: 20,
          type: "run.stopped",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      description: "Stopped by Albin",
      kind: "run",
      status: "stopped",
      title: "Run stopped",
    })
  )
})

test("does not mark stale in-progress traces as live after run stop", () => {
  const items = projectActivity(
    data({
      run: run({ status: "stopped" }),
      traces: [
        trace({
          timestamp: 10,
          type: "model.started",
        }),
        trace({
          timestamp: 20,
          type: "run.stopped",
        }),
      ],
    })
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      isLive: false,
      kind: "model",
      status: "running",
      title: "Thinking",
    })
  )
})

function data(overrides: Partial<ActivityData>): ActivityData {
  return { ...emptyActivityData(), run: run({}), ...overrides }
}

function trace(
  overrides: Partial<Doc<"traces">> & Pick<Doc<"traces">, "timestamp" | "type">
): Doc<"traces"> {
  return {
    _creationTime: overrides.timestamp,
    _id: id<"traces">(`trace-${overrides.timestamp}`),
    callId: undefined,
    key: `trace:${overrides.timestamp}`,
    runId: id<"runs">("run"),
    sequence: undefined,
    organizationId: "organization",
    ...overrides,
  } as Doc<"traces">
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: {
      context: [],
      source: { type: "manual" },
      title: "Run",
    },
    status: "running",
    organizationId: "organization",
    ...overrides,
  } as Doc<"runs">
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
