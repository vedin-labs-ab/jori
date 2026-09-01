import { describe, expect, test } from "vitest"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  compareAudiences,
  narrowingFolderName,
  type OrganizationMember,
  resolveAudience,
} from "./audience"

// The audience the console shows: the stored mode resolved against the
// live organization and the folders above it, and the difference a move
// would make to it.

const owner = testOwner
const memberA = "persons:a" as Id<"persons">
const memberB = "persons:b" as Id<"persons">
const members = [owner, memberA, memberB].map(person)

function person(personId: Id<"persons">): OrganizationMember {
  return { personId, name: personId, image: undefined }
}

function material(overrides: TableOverrides = {}) {
  return tableDoc(overrides) as Doc<"collections">
}

describe("resolving an audience", () => {
  test("an organization-wide material reaches every member", async () => {
    const { ctx } = databaseContext()
    const reached = await resolveAudience(
      ctx,
      material({ visibility: { mode: "organization" } }),
      members
    )

    expect(reached.map((each) => each.personId)).toEqual([
      owner,
      memberA,
      memberB,
    ])
  })

  test("a personal material reaches its owner alone", async () => {
    const { ctx } = databaseContext()
    const reached = await resolveAudience(
      ctx,
      material({ visibility: { mode: "private" }, ownerId: owner }),
      members
    )

    expect(reached.map((each) => each.personId)).toEqual([owner])
  })

  test("a folder narrows the audience below the material's own mode", async () => {
    const { database, ctx } = databaseContext()
    const folderId = await database.insert(
      "folders",
      folderDoc({
        visibility: { mode: "people", personIds: [memberA] },
        createdBy: owner,
      })
    )
    const reached = await resolveAudience(
      ctx,
      material({
        visibility: { mode: "organization" },
        ownerId: owner,
        folderId,
      }),
      members
    )

    // The owner sees what they own wherever it is filed; memberB does not.
    expect(reached.map((each) => each.personId)).toEqual([owner, memberA])
  })
})

describe("naming the narrowing folder", () => {
  test("answers the innermost ancestor that is not organization-wide", async () => {
    const { database, ctx } = databaseContext()
    const outerId = await database.insert(
      "folders",
      folderDoc({ name: "Finance", visibility: { mode: "private" } })
    )
    const innerId = await database.insert(
      "folders",
      folderDoc({
        name: "Reports",
        parentId: outerId,
        visibility: { mode: "organization" },
      })
    )

    expect(await narrowingFolderName(ctx, "org", innerId)).toBe("Finance")
    expect(await narrowingFolderName(ctx, "org", outerId)).toBe("Finance")
  })

  test("answers nothing when no folder above narrows anything", async () => {
    const { database, ctx } = databaseContext()
    const folderId = await database.insert(
      "folders",
      folderDoc({ visibility: { mode: "organization" } })
    )

    expect(await narrowingFolderName(ctx, "org", folderId)).toBeNull()
    expect(await narrowingFolderName(ctx, "org", undefined)).toBeNull()
  })
})

describe("comparing audiences across a move", () => {
  test("counts who drops out and who joins", () => {
    expect(
      compareAudiences({
        before: members,
        after: [person(owner)],
        memberCount: 3,
      })
    ).toEqual({ losing: 2, gaining: 0, becomesOrganizationWide: false })
    expect(
      compareAudiences({
        before: [person(owner)],
        after: members,
        memberCount: 3,
      })
    ).toEqual({ losing: 0, gaining: 2, becomesOrganizationWide: true })
  })

  test("an unchanged audience is nothing to confirm", () => {
    expect(
      compareAudiences({ before: members, after: members, memberCount: 3 })
    ).toEqual({ losing: 0, gaining: 0, becomesOrganizationWide: false })
  })
})
