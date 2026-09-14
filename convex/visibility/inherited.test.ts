import { expect, test } from "vitest"
import { testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { inheritedRestrictions } from "./inherited"
import { createSight } from "./sight"

test("inherited rules include every explicit ancestor in hierarchy order", async () => {
  const { database, ctx } = databaseContext()
  const root = await database.insert(
    "folders",
    folderDoc({ name: "Finance", visibility: { mode: "private" } })
  )
  const middle = await database.insert(
    "folders",
    folderDoc({
      name: "Renewals",
      parentId: root,
      visibility: { mode: "organization" },
    })
  )
  const child = await database.insert(
    "folders",
    folderDoc({
      name: "Contracts",
      parentId: middle,
      visibility: { mode: "people", personIds: [testOwner] },
    })
  )
  const result = await inheritedRestrictions(
    ctx,
    createSight(ctx, { organizationId: "org", personId: testOwner }),
    child
  )
  expect(result.unavailable).toBe(false)
  expect(result.folders.map((folder) => folder.name)).toEqual([
    "Finance",
    "Contracts",
  ])
  expect(result.folders[1]?.visibility).toEqual({
    mode: "people",
    personIds: [testOwner],
  })
})

test("an unrestricted chain contributes no inherited section", async () => {
  const { database, ctx } = databaseContext()
  const root = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "organization" } })
  )
  const sight = createSight(ctx, { organizationId: "org", personId: testOwner })
  expect(await inheritedRestrictions(ctx, sight, root)).toEqual({
    folders: [],
    unavailable: false,
  })
  expect(await inheritedRestrictions(ctx, sight, undefined)).toEqual({
    folders: [],
    unavailable: false,
  })
})

test("unavailable ancestors never disclose names, owners, or grants", async () => {
  const { database, ctx } = databaseContext()
  const hidden = await database.insert(
    "folders",
    folderDoc({ name: "Confidential", visibility: { mode: "private" } })
  )
  const foreign = await database.insert(
    "folders",
    folderDoc({
      name: "Other organization",
      organizationId: "other",
      visibility: { mode: "private" },
    })
  )
  const sight = createSight(ctx, {
    organizationId: "org",
    personId: "persons:other" as Id<"persons">,
  })
  for (const id of [hidden, foreign, "folders:missing" as Id<"folders">]) {
    expect(await inheritedRestrictions(ctx, sight, id)).toEqual({
      folders: [],
      unavailable: true,
    })
  }
  await database.patch(hidden, { parentId: hidden })
  expect(await inheritedRestrictions(ctx, sight, hidden)).toEqual({
    folders: [],
    unavailable: true,
  })
})
