import { expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import { anonymousSight, createSight, type SightArgs } from "./sight"

// The folder-cascade half of the resolver's verification suite: a viewer
// must be allowed by every ancestor folder as well as by the material's own
// visibility, with owners always seeing their own materials.

const owner = testOwner
const memberA = "persons:a" as Id<"persons">
const memberB = "persons:b" as Id<"persons">

function material(overrides: Record<string, unknown> = {}) {
  return tableDoc(overrides) as Doc<"collections">
}

function sight(
  ctx: unknown,
  args: Partial<SightArgs> & { teams?: string[] } = {}
) {
  const { teams, ...rest } = args

  return createSight(
    ctx as Parameters<typeof createSight>[0],
    { organizationId: "org", ...rest },
    teams === undefined ? {} : { teams: () => Promise.resolve(new Set(teams)) }
  )
}

test("an organization-wide resource inside an only-me folder is invisible to others", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "private" }, createdBy: owner })
  )
  const filed = material({
    visibility: { mode: "organization" },
    ownerId: owner,
    folderId,
  })

  expect(await sight(ctx, { personId: memberA }).canSee(filed)).toBe(false)
  expect(await sight(ctx, { personId: owner }).canSee(filed)).toBe(true)

  // Moving it out restores visibility.
  const moved = { ...filed, folderId: undefined }

  expect(await sight(ctx, { personId: memberA }).canSee(moved)).toBe(true)
})

test("nested folders compose: every ancestor must allow the viewer", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await database.insert(
    "folders",
    folderDoc({
      visibility: { mode: "people", personIds: [memberA] },
      createdBy: owner,
    })
  )
  const innerId = await database.insert(
    "folders",
    folderDoc({
      parentId: rootId,
      visibility: { mode: "organization" },
      createdBy: owner,
    })
  )
  const filed = material({
    visibility: { mode: "organization" },
    ownerId: owner,
    folderId: innerId,
  })

  expect(await sight(ctx, { personId: memberA }).canSee(filed)).toBe(true)
  expect(await sight(ctx, { personId: memberB }).canSee(filed)).toBe(false)
})

test("a personal resource inside a shared folder stays visible to its owner", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert(
    "folders",
    folderDoc({
      visibility: { mode: "teams", teamIds: ["team-sales"] },
      createdBy: memberA,
    })
  )
  const filed = material({
    visibility: { mode: "private" },
    ownerId: owner,
    folderId,
  })

  // The owner is not on the granted team, yet owns the material.
  expect(await sight(ctx, { personId: owner, teams: [] }).canSee(filed)).toBe(
    true
  )
  expect(
    await sight(ctx, { personId: memberB, teams: ["team-sales"] }).canSee(filed)
  ).toBe(false)
})

test("a public material inside a restricted folder is not anonymously readable", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "private" }, createdBy: owner })
  )
  const filed = material({
    visibility: { mode: "public" },
    ownerId: owner,
    folderId,
  })

  expect(await anonymousSight(ctx, "org").canSee(filed)).toBe(false)

  const publicFolderId = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "public" }, createdBy: owner })
  )

  expect(
    await anonymousSight(ctx, "org").canSee({
      ...filed,
      folderId: publicFolderId as Id<"folders">,
    })
  ).toBe(true)
})

test("folders themselves cascade, with a creator override", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "private" }, createdBy: owner })
  )
  const innerId = await database.insert(
    "folders",
    folderDoc({
      parentId: rootId,
      visibility: { mode: "organization" },
      createdBy: memberA,
    })
  )
  const inner = (await database.get(innerId)) as Doc<"folders"> | null

  if (inner === null) {
    throw new Error("missing inner folder")
  }

  expect(await sight(ctx, { personId: memberB }).canSeeFolder(inner)).toBe(
    false
  )
  expect(await sight(ctx, { personId: memberA }).canSeeFolder(inner)).toBe(true)
  expect(await sight(ctx, { personId: owner }).canSeeFolder(inner)).toBe(true)
})

test("a folder cycle reads as closed", async () => {
  const { database, ctx } = databaseContext()
  const firstId = await database.insert("folders", folderDoc())
  const secondId = await database.insert(
    "folders",
    folderDoc({ parentId: firstId })
  )

  await database.patch(firstId, { parentId: secondId })

  const filed = material({
    visibility: { mode: "organization" },
    folderId: firstId,
    ownerId: owner,
  })

  expect(await sight(ctx, { personId: memberA }).canSee(filed)).toBe(false)
})
