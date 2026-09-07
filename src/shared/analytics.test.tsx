// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { Analytics } from "./analytics"

const state = vi.hoisted(() => ({
  routeId: "/folders/$folderId/",
  capture: vi.fn(),
  init: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => state.routeId,
}))
vi.mock("./analytics/config", () => ({
  analyticsConfig: () => ({ key: "phc_public", options: {} }),
}))
vi.mock("./region/config", () => ({
  regionConfig: { current: "eu" },
  requireRegionOrigin: () => window.location.origin,
}))
vi.mock("posthog-js", () => ({
  default: { init: state.init, capture: state.capture },
}))
afterEach(cleanup)

test("explicit pageviews survive navigation without DOM content or duplicate strict-mode events", async () => {
  window.history.replaceState(
    {},
    "",
    "/folders/private-id?token=secret#private"
  )
  const view = render(
    <StrictMode>
      <Analytics>Confidential customer document</Analytics>
    </StrictMode>
  )
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  expect(state.init).toHaveBeenCalledTimes(1)
  expect(state.capture).toHaveBeenLastCalledWith("$pageview", {
    page: "folders",
  })

  state.routeId = "/chat/$conversationId/"
  view.rerender(
    <StrictMode>
      <Analytics>Private chat text</Analytics>
    </StrictMode>
  )
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(2))
  expect(state.capture).toHaveBeenLastCalledWith("$pageview", { page: "chat" })
  expect(JSON.stringify(state.capture.mock.calls)).not.toMatch(
    /secret|private|Confidential/i
  )
})
