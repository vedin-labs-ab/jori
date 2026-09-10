import { expect, test } from "vitest"
import { runDoc } from "../../test/convex/console"
import { databaseContext, id } from "../../test/convex/database"
import { createResourceSight, resourceCreation } from "./resources"

test("a deleted execution resource cannot fall back to creating organization-wide outputs", async () => {
  const { ctx, database } = databaseContext()
  const runId = await database.insert(
    "runs",
    runDoc({
      organizationId: "org",
      status: "running",
      principal: { kind: "organization" },
      job: { id: id<"jobs">("missing"), version: 1 },
    })
  )
  const args = { organizationId: "org", runId }
  await expect(createResourceSight(ctx, args)).rejects.toThrow(
    "no longer active"
  )
  await expect(resourceCreation(ctx, args)).rejects.toThrow("no longer active")
})
