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

const integrations = [
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
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
  convexMocks.useQuery.mockReturnValue(allIntegrationConnections())
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

export function integrationConnections(
  connectedIntegration?: (typeof integrations)[number]
) {
  return {
    integrations: integrations.map((integration) => ({
      integration,
      connected: integration === connectedIntegration,
    })),
  }
}

export function mockIntegrationConnections(
  connectedIntegration?: (typeof integrations)[number]
) {
  convexMocks.useQuery.mockReturnValue(
    integrationConnections(connectedIntegration)
  )
}

function allIntegrationConnections() {
  return {
    integrations: integrations.map((integration) => ({
      integration,
      connected: true,
    })),
  }
}
