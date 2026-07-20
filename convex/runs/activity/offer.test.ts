import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { projectRelationActivity } from "./relations"
import { type ActivityData } from "./types"

test("projects integration offers with integration metadata", () => {
  const items = projectRelationActivity({
    agents: [],
    approvals: [],
    artifacts: [],
    assets: [],
    offers: [
      {
        _creationTime: 1000,
        _id: "offer" as Id<"integrationOffers">,
        createdAt: 1000,
        expiresAt: 2000,
        integration: "github",
        runId: "run" as Id<"runs">,
        source: { surface: "milo" },
        status: "expired",
        summary: "Connect GitHub so Milo can inspect repositories.",
        organizationId: "organization",
        tokenHash: "token",
        updatedAt: 2000,
      } as Doc<"integrationOffers">,
    ],
    run: {} as Doc<"runs">,
    traces: [],
    waiters: [],
  } satisfies ActivityData)

  expect(items).toContainEqual(
    expect.objectContaining({
      description: "Connect GitHub so Milo can inspect repositories.",
      integration: "github",
      kind: "offer",
      status: "expired",
      title: "Integration offer expired",
    })
  )
})
