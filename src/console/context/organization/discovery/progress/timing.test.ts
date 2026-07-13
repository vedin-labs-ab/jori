import { describe, expect, test } from "vitest"
import { type OrganizationDiscovery } from "../../types"
import { createDiscoveryTasks } from "./tasks"

type Discovery = NonNullable<OrganizationDiscovery>
type DiscoveryStep = Discovery["steps"][number]

describe("discovery active timing", () => {
  test("times an activated queued path from processing start", () => {
    const [task] = createDiscoveryTasks(
      discovery([
        completedPageStep(0, 5, "https://example.com/"),
        activatedPageStep(5, 20, "https://example.com/about"),
      ]),
      25_000
    )

    expect(task).toMatchObject({
      elapsedMs: 10_000,
      status: "active",
    })
    expect(task?.items[1]).toMatchObject({
      startedAt: 20_000,
      status: "active",
    })
  })
})

function discovery(steps: DiscoveryStep[]): Discovery {
  return {
    _creationTime: 0,
    _id: "discovery" as Discovery["_id"],
    errors: [],
    startedAt: 0,
    status: "running",
    steps,
    tenantId: "tenant",
  }
}

function completedPageStep(
  startSeconds: number,
  endSeconds: number,
  url: string
): DiscoveryStep {
  return {
    completedAt: endSeconds * 1000,
    id: `completed-page-${startSeconds}-${url}`,
    kind: "page",
    label: `Reading ${url}`,
    startedAt: startSeconds * 1000,
    url,
  }
}

function activatedPageStep(
  queueSeconds: number,
  activeSeconds: number,
  url: string
): DiscoveryStep {
  return {
    activeAt: activeSeconds * 1000,
    id: `activated-page-${queueSeconds}-${url}`,
    kind: "page",
    label: `Exploring ${url}`,
    queuedAt: queueSeconds * 1000,
    startedAt: queueSeconds * 1000,
    url,
  }
}
