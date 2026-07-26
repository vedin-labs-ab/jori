import { expect, test } from "vitest"
import { automationSummary, capabilityGroupsFor } from "./format"
import { type AppSummary } from "./types"

test("groups app tools by canonical surface", () => {
  const groups = capabilityGroupsFor(
    appSummary({
      capabilities: [
        {
          access: "read",
          approvedAt: 1,
          description: "Search Gmail threads.",
          integrationId: undefined,
          label: "Search threads",
          surface: "gmail",
          tool: "google_gmail_search_threads",
          versionId: undefined,
        },
        {
          access: "write",
          approvedAt: 1,
          description: "Create a Gmail draft.",
          integrationId: undefined,
          label: "Create draft",
          surface: "gmail",
          tool: "google_gmail_create_draft",
          versionId: undefined,
        },
        {
          access: "write",
          approvedAt: 1,
          description: "Validate, store, and publish a new Jori app.",
          integrationId: undefined,
          label: "Create app",
          surface: "jori",
          tool: "create_app",
          versionId: undefined,
        },
      ],
    })
  )

  expect(groups.map((group) => group.type)).toEqual(["jori", "gmail"])
  expect(groups).toMatchObject([
    {
      label: "Jori",
      type: "jori",
      tools: [{ label: "Create app", tool: "create_app" }],
    },
    {
      label: "Gmail",
      type: "gmail",
      tools: [
        { access: "read", label: "Search threads" },
        { access: "write", label: "Create draft" },
      ],
    },
  ])
})

test("prefers the upcoming run over the last run in automation summaries", () => {
  const now = 10 * 60 * 1000

  expect(
    automationSummary(
      automation({ firedAt: now - 60_000, nextAt: now + 2 * 60 * 60 * 1000 }),
      now
    )
  ).toBe("Next in 2h")
})

test("falls back to the last run when no run is scheduled", () => {
  const now = 10 * 60 * 1000

  expect(
    automationSummary(automation({ firedAt: now - 3 * 60 * 1000 }), now)
  ).toBe("Ran 3m ago")
})

test("labels paused automations over run history", () => {
  expect(
    automationSummary(
      automation({ firedAt: 1, nextAt: 100, status: "paused" }),
      50
    )
  ).toBe("Paused")
})

test("labels active automations without runs as monitoring", () => {
  expect(automationSummary(automation({}), 1)).toBe("Monitoring")
})

function automation(
  overrides: Partial<AppSummary["automations"][number]>
): AppSummary["automations"][number] {
  return {
    automationId: "automation",
    name: "Automation",
    status: "active",
    firedAt: undefined,
    nextAt: undefined,
    updatedAt: 1,
    ...overrides,
  } as unknown as AppSummary["automations"][number]
}

function appSummary(overrides: Pick<AppSummary, "capabilities">): AppSummary {
  return {
    access: "personal",
    archivedAt: undefined,
    appId: "app",
    automations: [],
    createdAt: 1,
    ownerId: "user",
    title: "App",
    updatedAt: 1,
    versionId: undefined,
    versions: [],
    ...overrides,
  } as unknown as AppSummary
}
