import { describe, expect, test } from "vitest"
import {
  createDiscoveryTasks,
  discoveryFailed,
  discoveryReadyForReview,
} from "./progress-data"
import { type OrganizationDiscovery } from "./types"

type Discovery = NonNullable<OrganizationDiscovery>
type DiscoveryStep = Discovery["steps"][number]

describe("createDiscoveryTasks", () => {
  test("creates standalone summary tasks from summary steps", () => {
    const tasks = createDiscoveryTasks(
      discovery([
        pageStep(0, 5, "https://example.com/"),
        summaryStep(5, 10, "Drafting profile"),
      ]),
      10_000
    )

    expect(tasks.map((task) => task.type)).toEqual(["exploration", "summary"])
    expect(tasks[1]).toMatchObject({
      elapsedMs: 5000,
      items: [],
      label: "Drafting profile",
      status: "completed",
    })
  })

  test("excludes idle gaps from task elapsed time", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        pageStep(0, 5, "https://example.com/"),
        summaryStep(5, 20, "Summarizing homepage"),
        pageStep(20, 25, "https://example.com/about"),
      ]),
      25_000
    )

    expect(task?.elapsedMs).toBe(10_000)
  })

  test("does not double count overlapping task intervals", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        pageStep(5, 10, "https://example.com/"),
        pageStep(5, 10, "https://example.com/team"),
        pageStep(5, 10, "https://example.com/about"),
      ]),
      10_000
    )

    expect(task?.elapsedMs).toBe(5_000)
  })
})

describe("discovery exploration state", () => {
  test("keeps exploration active while discovery is still selecting paths", () => {
    const [task] = createDiscoveryTasks(
      discovery([pageStep(0, 5, "https://example.com/")], {
        status: "running",
      }),
      8_000
    )

    expect(task).toMatchObject({
      status: "active",
      items: [{ status: "completed" }],
    })
  })

  test("shows selected paths as queued before their crawl starts", () => {
    const [task] = createDiscoveryTasks(
      discovery(
        [
          pageStep(0, 5, "https://example.com/"),
          queuedPageStep(5, "https://example.com/about"),
        ],
        { status: "running" }
      ),
      8_000
    )

    expect(task).toMatchObject({
      status: "active",
      items: [{ status: "completed" }, { status: "queued" }],
    })
  })

  test("completes exploration once summary starts with no queued paths", () => {
    const tasks = createDiscoveryTasks(
      discovery(
        [
          pageStep(0, 5, "https://example.com/"),
          pageStep(5, 10, "https://example.com/about"),
          summaryStep(10, null, "Drafting profile"),
        ],
        { status: "running" }
      ),
      12_000
    )

    expect(tasks.map((task) => task.status)).toEqual(["completed", "active"])
  })
})

describe("discovery page failures", () => {
  test("marks page failures as task warnings when discovery succeeds", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        pageStep(0, 5, "https://example.com/"),
        pageStep(5, 8, "https://example.com/about", "Could not read about"),
        summaryStep(12, 20, "Summarizing what we found"),
      ]),
      20_000
    )

    expect(task?.status).toBe("warning")
    expect(task?.items.map((item) => item.status)).toEqual([
      "completed",
      "failed",
    ])
  })

  test("keeps page failures destructive when discovery fails", () => {
    const [task] = createDiscoveryTasks(
      discovery([pageStep(0, 5, "https://example.com/", "Could not read")]),
      20_000
    )

    expect(task?.status).toBe("failed")
    expect(task?.items[0]?.status).toBe("failed")
  })
})

describe("discovery completion state", () => {
  test("treats the latest completed summary as reviewable", () => {
    const run = discovery([
      pageStep(0, 5, "https://example.com/"),
      summaryStep(5, 10, "Drafting profile"),
    ])

    expect(discoveryReadyForReview(run)).toBe(true)
    expect(discoveryFailed(run)).toBe(false)
  })

  test("uses the run end time when a completed summary has no completion time", () => {
    const run = discovery([summaryStep(5, null, "Drafting profile")])
    const [task] = createDiscoveryTasks(run, 25_000)

    expect(task).toMatchObject({
      elapsedMs: 20_000,
      status: "completed",
    })
    expect(discoveryReadyForReview(run)).toBe(true)
  })

  test("keeps completed summary done when the client clock lags behind", () => {
    const run = discovery([summaryStep(5, 10, "Drafting profile")])
    const [task] = createDiscoveryTasks(run, 9000)

    expect(task).toMatchObject({
      status: "completed",
    })
    expect(discoveryReadyForReview(run)).toBe(true)
  })

  test("keeps an uncompleted summary active while the run is running", () => {
    const run = discovery([summaryStep(5, null, "Drafting profile")], {
      status: "running",
    })
    const [task] = createDiscoveryTasks(run, 12_000)

    expect(task).toMatchObject({
      elapsedMs: 7000,
      status: "active",
    })
    expect(discoveryReadyForReview(run)).toBe(false)
  })

  test("treats a latest summary error as a failed run", () => {
    const run = discovery([
      summaryStep(0, 5, "First pass"),
      summaryStep(10, 15, "Drafting profile", "Could not draft profile"),
    ])

    expect(discoveryReadyForReview(run)).toBe(false)
    expect(discoveryFailed(run)).toBe(true)
  })
})

function discovery(
  steps: DiscoveryStep[],
  options: { status?: Discovery["status"] } = {}
): Discovery {
  const status = options.status ?? "completed"

  return {
    _creationTime: 0,
    _id: "discovery" as Discovery["_id"],
    errors: stepErrors(steps),
    startedAt: 0,
    status,
    steps,
    tenantId: "tenant",
    ...(status === "completed" ? { endedAt: 25_000 } : {}),
  }
}

function pageStep(
  startSeconds: number,
  endSeconds: number,
  url: string,
  error?: string
): DiscoveryStep {
  return {
    completedAt: endSeconds * 1000,
    id: `page-${startSeconds}-${url}`,
    kind: "page",
    label: `Reading ${url}`,
    startedAt: startSeconds * 1000,
    url,
    ...(error === undefined ? {} : { error }),
  }
}

function queuedPageStep(queueSeconds: number, url: string): DiscoveryStep {
  return {
    id: `queued-page-${queueSeconds}-${url}`,
    kind: "page",
    label: `Exploring ${url}`,
    queuedAt: queueSeconds * 1000,
    url,
  }
}

function summaryStep(
  startSeconds: number,
  endSeconds: number | null,
  label: string,
  error?: string
): DiscoveryStep {
  return {
    id: `summary-${startSeconds}-${label}`,
    kind: "summary",
    label,
    startedAt: startSeconds * 1000,
    ...(endSeconds === null ? {} : { completedAt: endSeconds * 1000 }),
    ...(error === undefined ? {} : { error }),
  }
}

function stepErrors(steps: DiscoveryStep[]) {
  return steps.flatMap((step) => (step.error === undefined ? [] : [step.error]))
}
