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
import { saveConsent } from "./analytics/consent"

const state = vi.hoisted(() => ({
  routePath: "/folders/$folderId/",
  capture: vi.fn(),
  init: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
  loading: undefined as Promise<void> | undefined,
}))

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      matches: [
        {
          routeId: `/_workspace${state.routePath}`,
          fullPath: state.routePath,
          pathname: "/folders/private-id",
        },
      ],
    }),
}))
vi.mock("./analytics/config", () => ({
  analyticsConfig: () => ({ eu: { key: "phc_public", options: {} } }),
}))
vi.mock("./region/config", () => ({
  regionConfig: {
    current: "eu",
    enabled: new Set(["eu"]),
    publicOrigin: "http://localhost:3000",
  },
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
  for (const name of ["jori_analytics_eu", "ph_phc_public_posthog"]) {
    // biome-ignore lint/suspicious/noDocumentCookie: Reset the cookies a test may leave.
    document.cookie = `${name}=; Max-Age=0; Path=/`
  }
  state.routePath = "/folders/$folderId/"
  state.loading = undefined
})

test("workspace pageviews use path definitions without layout IDs, private parameters or strict-mode duplicates", async () => {
  saveConsent("eu", "accepted")
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

  state.routePath = "/chat/$conversationId/"
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
  expect(await screen.findByRole("button", { name: "Accept" })).toBeDefined()
  await act(async () => {})
  expect(state.init).not.toHaveBeenCalled()
  expect(state.capture).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Decline" }))
  state.routePath = "/chat/$conversationId/"
  view.rerender(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(state.init).not.toHaveBeenCalled()
  expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  expect(
    screen.getByRole("button", { name: "Decline" }).getAttribute("aria-pressed")
  ).toBe("true")
  expect(
    screen.getByRole("button", { name: "Accept" }).getAttribute("aria-pressed")
  ).toBe("false")
  fireEvent.click(screen.getByRole("button", { name: "Close" }))
  expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
  expect(state.init).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Accept" }))
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  expect(state.init).toHaveBeenCalledTimes(1)

  localStorage.setItem("ph_phc_public_posthog", "private-id")
  localStorage.setItem("auth-session", "keep")
  // biome-ignore lint/suspicious/noDocumentCookie: Seed the SDK cookie whose deletion this test verifies.
  document.cookie = "ph_phc_public_posthog=private-id; Path=/"
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Decline" }))
  expect(state.optOut).toHaveBeenCalled()
  expect(localStorage.getItem("ph_phc_public_posthog")).toBeNull()
  expect(document.cookie).not.toContain("ph_phc_public_posthog=")
  expect(localStorage.getItem("auth-session")).toBe("keep")
  state.routePath = "/files/"
  view.rerender(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  await act(async () => {})
  expect(state.capture).toHaveBeenCalledTimes(1)
})

test("a saved decline survives remounting and another tab can withdraw consent", async () => {
  saveConsent("eu", "declined")
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
  expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
  expect(state.init).not.toHaveBeenCalled()
  view.unmount()
  render(
    <Analytics>
      <PrivacyChoices />
    </Analytics>
  )
  expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Accept" }))
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  act(() => {
    saveConsent("eu", "declined")
    window.dispatchEvent(new Event("focus"))
  })
  expect(state.optOut).toHaveBeenCalled()
  expect(state.capture).toHaveBeenCalledTimes(1)
})

test("a malformed choice cannot enable analytics", async () => {
  // biome-ignore lint/suspicious/noDocumentCookie: Seed the value under test.
  document.cookie = "jori_analytics_eu=broken; Path=/"
  const { Analytics } = await import("./analytics")
  render(<Analytics>Content</Analytics>)
  expect(await screen.findByRole("button", { name: "Accept" })).toBeDefined()
  expect(state.init).not.toHaveBeenCalled()
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
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }))
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }))
  fireEvent.click(screen.getByRole("button", { name: "Decline" }))
  await act(async () => {
    finishLoading()
  })
  expect(state.init).not.toHaveBeenCalled()
  expect(state.capture).not.toHaveBeenCalled()
})

test("a captured event waits for acceptance and never loads the SDK before it", async () => {
  state.routePath = "/unknown/"
  const { Analytics } = await import("./analytics")
  const { useCapture } = await import("./analytics/context")
  function Feature() {
    const capture = useCapture()
    return (
      <button
        onClick={() => capture("$pageview", { page: "jobs" })}
        type="button"
      >
        Use feature
      </button>
    )
  }
  render(
    <Analytics>
      <Feature />
    </Analytics>
  )
  await screen.findByRole("button", { name: "Accept" })
  fireEvent.click(screen.getByRole("button", { name: "Use feature" }))
  await act(async () => {})
  expect(state.init).not.toHaveBeenCalled()
  expect(state.capture).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Accept" }))
  fireEvent.click(screen.getByRole("button", { name: "Use feature" }))
  await waitFor(() => expect(state.capture).toHaveBeenCalledTimes(1))
  expect(state.init).toHaveBeenCalledTimes(1)
  expect(state.capture).toHaveBeenLastCalledWith("$pageview", { page: "jobs" })
})
