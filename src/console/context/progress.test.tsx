// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { DiscoveryProgress } from "./progress"
import { type OrganizationDiscovery } from "./types"

type Discovery = NonNullable<OrganizationDiscovery>
type DiscoveryStep = Discovery["steps"][number]

afterEach(() => {
  cleanup()
})

describe("discovery progress domain paths", () => {
  test("hides path subitems as soon as the domain completes", () => {
    const { rerender } = render(
      <DiscoveryProgress
        discovery={discovery([pageStep(0, 5, "https://example.com/")], {
          status: "running",
        })}
      />
    )

    expect(screen.getByText("example.com")).toBeDefined()
    expect(screen.getByText("/")).toBeDefined()

    rerender(
      <DiscoveryProgress
        discovery={discovery(
          [
            pageStep(0, 5, "https://example.com/"),
            summaryStep(5, null, "Drafting profile"),
          ],
          { status: "running" }
        )}
      />
    )

    expect(screen.getByText("example.com")).toBeDefined()
    expect(screen.queryByText("/")).toBeNull()
  })

  test("does not render path subitems for completed domains", () => {
    render(
      <DiscoveryProgress
        discovery={discovery([
          pageStep(0, 5, "https://example.com/"),
          summaryStep(5, 10, "Drafting profile"),
        ])}
      />
    )

    expect(screen.getByText("example.com")).toBeDefined()
    expect(screen.queryByText("/")).toBeNull()
  })
})

describe("discovery progress timing", () => {
  test("does not render NaN for queued paths", () => {
    render(
      <DiscoveryProgress
        discovery={discovery(
          [
            pageStep(0, 5, "https://example.com/"),
            queuedPageStep(5, "https://example.com/about"),
          ],
          { status: "running" }
        )}
      />
    )

    expect(screen.getByText("/about")).toBeDefined()
    expect(screen.queryByText(/NaN/)).toBeNull()
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
    errors: [],
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
  url: string
): DiscoveryStep {
  return {
    completedAt: endSeconds * 1000,
    id: `page-${startSeconds}-${url}`,
    kind: "page",
    label: `Reading ${url}`,
    startedAt: startSeconds * 1000,
    url,
  }
}

function queuedPageStep(queueSeconds: number, url: string): DiscoveryStep {
  return {
    id: `queued-page-${queueSeconds}-${url}`,
    kind: "page",
    label: `Exploring ${url}`,
    queuedAt: queueSeconds * 1000,
    startedAt: queueSeconds * 1000,
    url,
  }
}

function summaryStep(
  startSeconds: number,
  endSeconds: number | null,
  label: string
): DiscoveryStep {
  return {
    id: `summary-${startSeconds}-${label}`,
    kind: "summary",
    label,
    startedAt: startSeconds * 1000,
    ...(endSeconds === null ? {} : { completedAt: endSeconds * 1000 }),
  }
}
