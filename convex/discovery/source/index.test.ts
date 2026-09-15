import { expect, test } from "vitest"
import { runDoc } from "../../../test/convex/console"
import { databaseContext, id } from "../../../test/convex/database"
import { fileDoc, folderDoc, jobDoc } from "../../../test/convex/folders"
import { createSight } from "../../visibility/sight"
import { project } from "./index"

async function delegated() {
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
  const rootId = await database.insert(
    "runs",
    runDoc({
      _id: id<"runs">("root"),
      organizationId: "org",
      job: { id: jobId, version: 1 },
      audience: "organization",
    })
  )
  const childId = await database.insert(
    "runs",
    runDoc({
      _id: id<"runs">("child"),
      organizationId: "org",
      rootId,
      createdBy: outsider,
      audience: "organization",
    })
  )
  return { database, ctx, owner, member, outsider, folderId, jobId, childId }
}

test("delegated search results inherit the root job's authority and live folder access", async () => {
  const { database, ctx, owner, member, outsider, folderId, jobId, childId } =
    await delegated()
  const key = `runs:${childId}`
  const sight = (personId: typeof member) =>
    createSight(ctx, { organizationId: "org", personId })
  const allowed = await project(ctx, key, sight(member))
  expect(allowed?.authorityKey).toBe(`jobs:${jobId}`)
  expect(allowed?.gate.ownerId).toBe(owner)
  expect(await project(ctx, key, sight(outsider))).toBeNull()
  await database.patch(folderId, { visibility: { mode: "private" } })
  expect(await project(ctx, key, sight(member))).toBeNull()
  expect(await project(ctx, key, sight(owner))).not.toBeNull()
  await database.delete(jobId)
  expect(await project(ctx, key, sight(owner))).toBeNull()
  expect(await project(ctx, key)).toBeNull()
})

test("folder and material owners retain their resources without exposing private ancestor labels", async () => {
  const { database, ctx } = databaseContext()
  const owner = id<"persons">("owner")
  const stranger = id<"persons">("stranger")
  const parent = await database.insert(
    "folders",
    folderDoc({
      name: "Secret ancestor name",
      createdBy: stranger,
      visibility: { mode: "private" },
    })
  )
  const folder = await database.insert(
    "folders",
    folderDoc({
      name: "My folder",
      parentId: parent,
      createdBy: owner,
      visibility: { mode: "private" },
    })
  )
  const file = await database.insert(
    "files",
    fileDoc({
      ownerId: owner,
      folderId: parent,
      visibility: { mode: "private" },
    })
  )
  const sight = createSight(ctx, { organizationId: "org", personId: owner })
  const results = await Promise.all([
    project(ctx, `folders:${folder}`, sight),
    project(ctx, `files:${file}`, sight),
  ])
  expect(results.every(Boolean)).toBe(true)
  expect(JSON.stringify(results)).not.toContain("Secret ancestor name")
  const foreign = createSight(ctx, {
    organizationId: "foreign",
    personId: owner,
  })
  expect(await project(ctx, `files:${file}`, foreign)).toBeNull()
  expect(await project(ctx, `folders:${folder}`, foreign)).toBeNull()
})
