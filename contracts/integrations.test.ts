import { describe, expect, test } from "vitest"
import {
  integrationLabel,
  integrations,
  isGoogleIntegration,
  isMessageSurface,
  isMicrosoftIntegration,
  isUserScopedIntegration,
  messageIntegrations,
  messageSurfaceLabel,
  messageSurfaces,
  providerForIntegration,
  toolSurfaceLabel,
  toolSurfaces,
} from "./integrations"

describe("integration catalog", () => {
  test("keeps provider boundaries separate from granular integrations", () => {
    expect(providerForIntegration("gmail")).toBe("google")
    expect(providerForIntegration("googleCalendar")).toBe("google")
    expect(providerForIntegration("microsoftEmail")).toBe("microsoft")
    expect(providerForIntegration("microsoftCalendar")).toBe("microsoft")

    expect(isGoogleIntegration("gmail")).toBe(true)
    expect(isGoogleIntegration("slack")).toBe(false)
    expect(isMicrosoftIntegration("microsoftEmail")).toBe(true)
    expect(isMicrosoftIntegration("notion")).toBe(false)
  })

  test("models Jori as a native tool surface, not an integration", () => {
    expect(toolSurfaces).toContain("jori")
    expect(integrations).not.toContain("jori")
    expect(toolSurfaceLabel("jori")).toBe("Jori")
    expect(integrationLabel("gmail")).toBe("Gmail")
  })

  test("models the console as a message surface, not an integration", () => {
    expect(messageSurfaces).toEqual(["console", ...messageIntegrations])
    expect(integrations).not.toContain("console")
    expect(toolSurfaces).not.toContain("console")
    expect(isMessageSurface("console")).toBe(true)
    expect(isMessageSurface("gmail")).toBe(false)
    expect(messageSurfaceLabel("console")).toBe("Console")
    expect(messageSurfaceLabel("slack")).toBe("Slack")
  })

  test("marks only personal account integrations as user scoped", () => {
    expect(isUserScopedIntegration("gmail")).toBe(true)
    expect(isUserScopedIntegration("googleCalendar")).toBe(true)
    expect(isUserScopedIntegration("microsoftEmail")).toBe(true)
    expect(isUserScopedIntegration("microsoftCalendar")).toBe(true)

    expect(isUserScopedIntegration("github")).toBe(false)
    expect(isUserScopedIntegration("slack")).toBe(false)
  })
})
