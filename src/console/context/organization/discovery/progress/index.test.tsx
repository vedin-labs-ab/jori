// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { type OrganizationDiscovery } from "../../types"
import { DiscoveryProgress } from "."

type Discovery = NonNullable<OrganizationDiscovery>
type DiscoveryStep = Discovery["steps"][number]

afterEach(() => {
  cleanup()
})

describe("discovery progress manual expansion", () => {
  test("opens live domain tasks by default and lets users toggle them", () => {
    render(
      <DiscoveryProgress
        discovery={discovery([pageStep(0, 5, "https://example.com/")], {
          status: "running",
        })}
      />
    )

    const trigger = screen.getByRole("button", { name: /example[.]com/ })
    expect(trigger.getAttribute("aria-expanded")).toBe("true")

    fireEvent.click(trigger)

    expect(trigger.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(trigger)

    expect(trigger.getAttribute("aria-expanded")).toBe("true")
  })
})

describe("discovery progress completion expansion", () => {
  test("closes a domain task as soon as it completes", () => {
    const { rerender } = render(
      <DiscoveryProgress
        discovery={discovery([pageStep(0, 5, "https://example.com/")], {
          status: "running",
        })}
      />
    )

    expect(
      screen
        .getByRole("button", { name: /example[.]com/ })
        .getAttribute("aria-expanded")
    ).toBe("true")

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

    expect(
      screen
        .getByRole("button", { name: /example[.]com/ })
        .getAttribute("aria-expanded")
    ).toBe("false")
  })

  test("lets completed domain tasks be reopened manually", () => {
    render(
      <DiscoveryProgress
        discovery={discovery([
          pageStep(0, 5, "https://example.com/"),
          summaryStep(5, 10, "Drafting profile"),
        ])}
      />
    )

    const trigger = screen.getByRole("button", { name: /example[.]com/ })
    expect(trigger.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(trigger)

    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText("/")).toBeDefined()
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
    organizationId: "organization",
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
