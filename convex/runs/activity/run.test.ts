import { expect, test } from "vitest"
import { activityData, runDoc, traceDoc } from "../../../test/convex/console"
import { id } from "../../../test/convex/database"
import { projectActivity } from "./project"

test("does not mark historical run lifecycle events as live", () => {
  const items = projectActivity(
    activityData({
      traces: [
        traceDoc({
          timestamp: 1,
          type: "run.started",
        }),
        traceDoc({
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
    activityData({
      traces: [
        traceDoc({
          data: {
            input: { command: "pnpm test" },
            tool: { access: "write", name: "bash", route: "sandbox" },
          },
          timestamp: 10,
          type: "tool.started",
        }),
        traceDoc({
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
    activityData({
      run: runDoc({
        status: "stopped",
        stoppedBy: {
          kind: "person",
          name: "Albin",
          personId: id<"persons">("person"),
        },
      }),
      traces: [
        traceDoc({
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
    activityData({
      run: runDoc({ status: "stopped" }),
      traces: [
        traceDoc({
          timestamp: 10,
          type: "model.started",
        }),
        traceDoc({
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
