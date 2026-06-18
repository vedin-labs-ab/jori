import { expect, test } from "vitest"
import { capabilityGroupsFor, toolSurfaceList } from "./format"
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
