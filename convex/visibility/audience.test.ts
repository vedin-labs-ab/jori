import { describe, expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/materials/collections"
import { folderDoc } from "../../test/convex/materials/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  compareAudiences,
  compareMove,
  type OrganizationMember,
  resolveAudience,
} from "./audience"
import { inheritedRestrictions } from "./inherited"
import { createSight } from "./sight"
import { folderGate } from "./target"

// The audience the console shows: the stored mode resolved against the
// live organization and the folders above it, and the difference a move
// would make to it. A folder is compared as its own gate, which is what
// everything filed inside it inherits.

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
    const sight = createSight(ctx, { organizationId: "org", personId: owner })
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

    expect(
      (await inheritedRestrictions(ctx, sight, innerId)).folders.at(-1)?.name ??
        null
    ).toBe("Finance")
    expect(
      (await inheritedRestrictions(ctx, sight, outerId)).folders.at(-1)?.name ??
        null
    ).toBe("Finance")
  })

  test("answers nothing when no folder above narrows anything", async () => {
    const { database, ctx } = databaseContext()
    const sight = createSight(ctx, { organizationId: "org", personId: owner })
    const folderId = await database.insert(
      "folders",
      folderDoc({ visibility: { mode: "organization" } })
    )

    expect(
      (await inheritedRestrictions(ctx, sight, folderId)).folders.at(-1)
        ?.name ?? null
    ).toBeNull()
    expect(
      (await inheritedRestrictions(ctx, sight, undefined)).folders.at(-1)
        ?.name ?? null
    ).toBeNull()
  })
})

describe("resolving a candidate grant", () => {
  test("a teams grant naming no live team reaches its owner alone", async () => {
    const { ctx } = databaseContext()
    const reached = await resolveAudience(
      ctx,
      material({ visibility: { mode: "teams", teamIds: [] }, ownerId: owner }),
      members
    )

    // What a foreign team id is filtered down to at the query boundary,
    // resolved: nobody joins the audience on the strength of it.
    expect(reached.map((each) => each.personId)).toEqual([owner])
  })
})

describe("comparing a folder's audience across a re-parent", () => {
  test("re-parenting out of a narrow folder widens the whole subtree", async () => {
    const { database, ctx } = databaseContext()
    const closedId = await database.insert(
      "folders",
      folderDoc({
        visibility: { mode: "people", personIds: [memberA] },
        createdBy: owner,
      })
    )
    const movedId = await database.insert(
      "folders",
      folderDoc({
        parentId: closedId,
        visibility: { mode: "organization" },
        createdBy: owner,
      })
    )

    // Out of the closed parent and up to the top level, the folder — and
    // so everything in it — reaches the whole organization.
    expect(
      await compareMove(
        ctx,
        await gateOf(database, movedId),
        undefined,
        members
      )
    ).toEqual({ losing: 0, gaining: 1, becomesOrganizationWide: true })
  })

  test("re-parenting into a narrow folder drops people from the subtree", async () => {
    const { database, ctx } = databaseContext()
    const closedId = await database.insert(
      "folders",
      folderDoc({
        visibility: { mode: "people", personIds: [memberA] },
        createdBy: owner,
      })
    )
    const movedId = await database.insert(
      "folders",
      folderDoc({ visibility: { mode: "organization" }, createdBy: owner })
    )

    // memberB loses the folder and its contents; the creator keeps both.
    expect(
      await compareMove(ctx, await gateOf(database, movedId), closedId, members)
    ).toEqual({ losing: 1, gaining: 0, becomesOrganizationWide: false })
  })

  test("a re-parent between equally open folders asks nothing", async () => {
    const { database, ctx } = databaseContext()
    const firstId = await database.insert("folders", folderDoc())
    const secondId = await database.insert("folders", folderDoc())
    const movedId = await database.insert(
      "folders",
      folderDoc({ parentId: firstId })
    )

    expect(
      await compareMove(ctx, await gateOf(database, movedId), secondId, members)
    ).toEqual({ losing: 0, gaining: 0, becomesOrganizationWide: false })
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

/** The stored folder, read back as the gate a move compares. */
async function gateOf(database: TestDatabase, folderId: Id<"folders">) {
  const folder = (await database.get(folderId)) as Doc<"folders"> | null

  if (folder === null) {
    throw new Error("missing folder")
  }

  return folderGate(folder)
}
