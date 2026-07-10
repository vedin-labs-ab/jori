import { expect, test } from "vitest"
import {
  automationSummary,
  capabilityGroupsFor,
  currentVersionMessage,
  toolSurfaceList,
} from "./format"
import { type ArtifactSummary } from "./types"

test("groups artifact tools by canonical surface", () => {
  const groups = capabilityGroupsFor(
    artifactSummary({
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
          description: "Validate, store, and publish a new Milo artifact.",
          integrationId: undefined,
          label: "Create artifact",
          surface: "milo",
          tool: "create_artifact",
          versionId: undefined,
        },
      ],
    })
  )

  expect(toolSurfaceList(groups)).toEqual(["milo", "gmail"])
  expect(groups).toMatchObject([
    {
      label: "Milo",
      type: "milo",
      tools: [{ label: "Create artifact", tool: "create_artifact" }],
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

test("reads the current version message", () => {
  const artifact = {
    ...artifactSummary({ capabilities: [] }),
    versions: [
      { isCurrent: false, message: "Newer draft" },
      { isCurrent: true, message: "Inbox triage workspace" },
    ],
  } as unknown as ArtifactSummary

  expect(currentVersionMessage(artifact)).toBe("Inbox triage workspace")
  expect(
    currentVersionMessage(artifactSummary({ capabilities: [] }))
  ).toBeUndefined()
})

function automation(
  overrides: Partial<ArtifactSummary["automations"][number]>
): ArtifactSummary["automations"][number] {
  return {
    automationId: "automation",
    name: "Automation",
    status: "active",
    firedAt: undefined,
    nextAt: undefined,
    updatedAt: 1,
    ...overrides,
  } as unknown as ArtifactSummary["automations"][number]
}

function artifactSummary(
  overrides: Pick<ArtifactSummary, "capabilities">
): ArtifactSummary {
  return {
    access: "personal",
    archivedAt: undefined,
    artifactId: "artifact",
    automations: [],
    createdAt: 1,
    ownerId: "user",
    title: "Artifact",
    updatedAt: 1,
    versionId: undefined,
    versions: [],
    ...overrides,
  } as unknown as ArtifactSummary
}
