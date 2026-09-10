import { expect, test } from "vitest"
import { runDoc } from "../../test/convex/console"
import { databaseContext, id } from "../../test/convex/database"
import { folderDoc, jobDoc } from "../../test/convex/folders"
import { canSeeRun } from "./visibility"

test("job run history and delegated runs follow the resource's folder access", async () => {
  const { database, ctx } = databaseContext()
  const owner = id<"persons">("owner")
  const member = id<"persons">("member")
  const outsider = id<"persons">("outsider")
  const folderId = await database.insert(
    "folders",
    folderDoc({
      createdBy: owner,
      visibility: { mode: "people", personIds: [member] },
    })
  )
  const jobId = await database.insert(
    "jobs",
    jobDoc({ createdBy: owner, folderId })
  )
  const root = runDoc({
    organizationId: "org",
    audience: "organization",
    job: { id: jobId, version: 1 },
  })
  const rootId = await database.insert("runs", root)
  const child = runDoc({
    organizationId: "org",
    audience: "organization",
    rootId,
  })
  expect(await canSeeRun(ctx, root, member)).toBe(true)
  expect(await canSeeRun(ctx, root, outsider)).toBe(false)
  expect(await canSeeRun(ctx, child, outsider)).toBe(false)
  await database.patch(folderId, { visibility: { mode: "private" } })
  expect(await canSeeRun(ctx, root, member)).toBe(false)
  expect(await canSeeRun(ctx, root, owner)).toBe(true)
  await database.delete(jobId)
  expect(await canSeeRun(ctx, root, owner)).toBe(false)
  expect(await canSeeRun(ctx, child, owner)).toBe(false)
})
