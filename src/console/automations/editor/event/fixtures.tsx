import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"
import { type AutomationFormValues, emptyAutomationForm } from "../../types"
import { EventFields } from "./index"

const convexMocks = vi.hoisted(() => ({
  useAction: vi.fn(() => vi.fn()),
  useQuery: vi.fn(),
}))

vi.mock("convex/react", () => ({
  useAction: convexMocks.useAction,
  useQuery: convexMocks.useQuery,
}))

const providers = [
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
  "googleDrive",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
] as const

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  Object.assign(HTMLElement.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
  convexMocks.useQuery.mockReturnValue(allProviderConnections())
})

export function renderEventFields(
  values: Partial<AutomationFormValues> = {},
  onValuesChange: (values: AutomationFormValues) => void = () => undefined
) {
  render(
    <EventFields
      tenantId="tenant"
      onValuesChange={onValuesChange}
      values={{
        ...emptyAutomationForm,
        type: "event",
        ...values,
      }}
    />
  )
}

export function providerConnections(
  connectedProvider?: (typeof providers)[number]
) {
  return {
    providers: providers.map((provider) => ({
      provider,
      connected: provider === connectedProvider,
    })),
  }
}

export function mockProviderConnections(
  connectedProvider?: (typeof providers)[number]
) {
  convexMocks.useQuery.mockReturnValue(providerConnections(connectedProvider))
}

function allProviderConnections() {
  return {
    providers: providers.map((provider) => ({ provider, connected: true })),
  }
}
