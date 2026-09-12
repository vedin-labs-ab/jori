// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { consentKey, saveConsent } from "./analytics/consent"

const state = vi.hoisted(() => ({
  routeId: "/folders/$folderId/",
  capture: vi.fn(),
  init: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
  loading: undefined as Promise<void> | undefined,
}))

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => state.routeId,
}))
vi.mock("./analytics/config", () => ({
  analyticsConfig: () => ({ key: "phc_public", options: {} }),
}))
vi.mock("./region/config", () => ({
  regionConfig: { current: "eu", publicOrigin: "https://www.usejori.com" },
  requireRegionOrigin: () => window.location.origin,
}))
vi.mock("posthog-js", async () => {
  await state.loading
  return {
    default: {
      init: state.init,
      capture: state.capture,
      opt_in_capturing: state.optIn,
      opt_out_capturing: state.optOut,
    },
  }
})
afterEach(cleanup)
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  state.routeId = "/folders/$folderId/"
  state.loading = undefined
})

test("explicit pageviews survive navigation without DOM content or duplicate strict-mode events", async () => {
  saveConsent("accepted")
  const { Analytics } = await import("./analytics")
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

test("analytics starts only after acceptance and stops when consent is withdrawn", async () => {
  const { Analytics } = await import("./analytics")
  const { PrivacyChoices } = await import("./analytics/preferences")
  const view = render(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(
    await screen.findByRole("button", { name: "Accept analytics" })
  ).toBeDefined()
  await act(async () => {})
  expect(state.init).not.toHaveBeenCalled()
  expect(state.capture).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }))
  state.routeId = "/chat/$conversationId/"
  view.rerender(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(state.init).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Accept analytics" }))
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  expect(state.init).toHaveBeenCalledTimes(1)

  localStorage.setItem("ph_phc_public_posthog", "private-id")
  localStorage.setItem("auth-session", "keep")
  // biome-ignore lint/suspicious/noDocumentCookie: Seed the SDK cookie whose deletion this test verifies.
  document.cookie = "ph_phc_public_posthog=private-id; Path=/"
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }))
  expect(state.optOut).toHaveBeenCalled()
  expect(localStorage.getItem("ph_phc_public_posthog")).toBeNull()
  expect(document.cookie).not.toContain("ph_phc_public_posthog=")
  expect(localStorage.getItem("auth-session")).toBe("keep")
  state.routeId = "/files/"
  view.rerender(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  await act(async () => {})
  expect(state.capture).toHaveBeenCalledTimes(1)
})

test("a saved decline survives remounting and another tab can withdraw consent", async () => {
  saveConsent("declined")
  const { Analytics } = await import("./analytics")
  const { PrivacyChoices } = await import("./analytics/preferences")
  const view = render(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(
    await screen.findByRole("button", { name: "Privacy choices" })
  ).toBeDefined()
  expect(screen.queryByRole("button", { name: "Accept analytics" })).toBeNull()
  expect(state.init).not.toHaveBeenCalled()
  view.unmount()
  render(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(screen.queryByRole("button", { name: "Accept analytics" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Accept analytics" }))
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  act(() => {
    saveConsent("declined")
    window.dispatchEvent(new StorageEvent("storage", { key: consentKey }))
  })
  expect(state.optOut).toHaveBeenCalled()
  expect(state.capture).toHaveBeenCalledTimes(1)
})

test("expired or malformed consent cannot enable analytics", async () => {
  localStorage.setItem(
    consentKey,
    JSON.stringify({ choice: "accepted", expires: Date.now() - 1 })
  )
  const { Analytics } = await import("./analytics")
  render(<Analytics>Content</Analytics>)
  expect(
    await screen.findByRole("button", { name: "Accept analytics" })
  ).toBeDefined()
  expect(state.init).not.toHaveBeenCalled()
  act(() => {
    localStorage.setItem(consentKey, "broken")
    window.dispatchEvent(new StorageEvent("storage", { key: consentKey }))
  })
  expect(state.capture).not.toHaveBeenCalled()
})

test("withdrawing while the SDK loads prevents initialization and capture", async () => {
  let finishLoading = () => {}
  state.loading = new Promise<void>((resolve) => {
    finishLoading = resolve
  })
  const { Analytics } = await import("./analytics")
  const { PrivacyChoices } = await import("./analytics/preferences")
  render(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  fireEvent.click(
    await screen.findByRole("button", { name: "Accept analytics" })
  )
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Decline analytics" }))
  await act(async () => {
    finishLoading()
  })
  expect(state.init).not.toHaveBeenCalled()
  expect(state.capture).not.toHaveBeenCalled()
})
