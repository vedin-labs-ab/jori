// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { IntegrationCard, type IntegrationCardConfig } from "."

const controls = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnecting: false,
  isDisconnecting: false,
}))
vi.mock("./install", () => ({ useIntegrationInstall: () => controls }))
vi.mock("../disconnect/controller", () => ({
  useIntegrationDisconnect: () => controls,
}))

beforeEach(() => {
  vi.clearAllMocks()
  controls.isConnecting = false
  controls.isDisconnecting = false
})
afterEach(cleanup)

test("reconnects an active account through installation without disconnecting it", () => {
  renderCard("active")
  fireEvent.click(screen.getByRole("button", { name: "Reconnect" }))
  expect(controls.connect).toHaveBeenCalledOnce()
  expect(controls.disconnect).not.toHaveBeenCalled()
})

test("cannot disconnect while reauthorization is pending", () => {
  controls.isConnecting = true
  renderCard("active")
  expect(
    screen.getByRole("button", { name: "Disconnect" }).hasAttribute("disabled")
  ).toBe(true)
  expect(
    screen.getByRole("button", { name: "Connecting" }).hasAttribute("disabled")
  ).toBe(true)
})

test("offers reconnect for expired access and the provider install action for an unconnected account", () => {
  const view = renderCard("expired")
  expect(screen.getByRole("button", { name: "Reconnect" })).toBeDefined()
  view.unmount()
  renderCard("disconnected")
  expect(screen.getByRole("button", { name: "Connect GitHub" })).toBeDefined()
})

function renderCard(status: "active" | "expired" | "disconnected") {
  return render(
    <IntegrationCard
      config={config}
      headline="Jori test"
      organizationId="test"
      status={{ status }}
      permissions={{
        permissions: [],
        pendingTool: undefined,
        getSurfacePermissions: () => [],
        updatePermission: vi.fn(),
      }}
    />
  )
}

const config: IntegrationCardConfig = {
  action: "Connect GitHub",
  connectedDetail: "Connected repositories",
  connectError: "Could not connect",
  emptyDetail: "Connect repositories",
  installPath: "/github/install",
  label: "GitHub",
  loading: "Connecting",
  logo: { src: "/logos/integrations/github.svg", alt: "GitHub" },
  integration: "github",
}
