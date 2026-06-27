import { describe, expect, test } from "vitest"
import { createDiscoveryTasks } from "./progress-data"
import { type OrganizationDiscovery } from "./types"

type Discovery = NonNullable<OrganizationDiscovery>
type DiscoveryStep = Discovery["steps"][number]

describe("createDiscoveryTasks", () => {
  test("excludes idle gaps from task elapsed time", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        step(0, "reading", "Reading homepage", "https://example.com/"),
        step(5, "extracting", "Summarizing homepage"),
        step(20, "exploring", "Exploring about", "https://example.com/about"),
        step(25, "done", "Done"),
      ]),
      25_000
    )

    expect(task?.elapsedMs).toBe(10_000)
  })

  test("does not double count overlapping task intervals", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        step(5, "reading", "Reading homepage", "https://example.com/"),
        step(10, "exploring", "Exploring team", "https://example.com/team"),
        step(5, "exploring", "Exploring about", "https://example.com/about"),
        step(10, "done", "Done"),
      ]),
      10_000
    )

    expect(task?.elapsedMs).toBe(5_000)
  })
})

describe("discovery page failures", () => {
  test("marks page failures as task warnings when discovery succeeds", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        step(0, "reading", "Reading homepage", "https://example.com/"),
        step(5, "exploring", "Exploring about", "https://example.com/about"),
        step(8, "error", "Could not read about", "https://example.com/about"),
        step(12, "extracting", "Summarizing what we found"),
        step(20, "done", "Draft ready for review"),
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
      discovery(
        [
          step(0, "reading", "Reading homepage", "https://example.com/"),
          step(5, "error", "Could not read homepage", "https://example.com/"),
        ],
        "failed"
      ),
      20_000
    )

    expect(task?.status).toBe("failed")
    expect(task?.items[0]?.status).toBe("failed")
  })
})

function discovery(
  steps: DiscoveryStep[],
  status: Discovery["status"] = "succeeded"
): Discovery {
  return {
    _creationTime: 0,
    _id: "discovery" as Discovery["_id"],
    endedAt: 25_000,
    startedAt: 0,
    status,
    steps,
    tenantId: "tenant",
    ...(status === "failed" ? { error: "Discovery failed." } : {}),
  }
}

function step(
  seconds: number,
  kind: DiscoveryStep["kind"],
  label: string,
  url?: string
): DiscoveryStep {
  return {
    at: seconds * 1000,
    kind,
    label,
    ...(url === undefined ? {} : { url }),
  }
}
