import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"
import { emptyJobForm, type JobFormValues } from "../../types"
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
  values: Partial<JobFormValues> = {},
  onValuesChange: (values: JobFormValues) => void = () => undefined
) {
  render(
    <EventFields
      organizationId="organization"
      onValuesChange={onValuesChange}
      values={{
        ...emptyJobForm,
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
