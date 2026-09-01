import { describe, expect, test } from "vitest"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { createSight, type SightArgs } from "./sight"

// The resolver's verification suite: one place proves who sees what for
// every visibility mode and for the folder cascade.

const owner = testOwner
const memberA = "persons:a" as Id<"persons">
const memberB = "persons:b" as Id<"persons">
const memberC = "persons:c" as Id<"persons">
const memberD = "persons:d" as Id<"persons">

function material(overrides: TableOverrides = {}) {
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

describe("only me", () => {
  const table = material({ visibility: { mode: "private" }, ownerId: owner })

  test("a second organization member cannot see it; the owner can", async () => {
    const { ctx } = databaseContext()

    expect(await sight(ctx, { personId: memberA }).canSee(table)).toBe(false)
    expect(await sight(ctx, { personId: owner }).canSee(table)).toBe(true)
  })
})

describe("specific people", () => {
  const granted = material({
    visibility: { mode: "people", personIds: [memberA, memberB, memberC] },
    ownerId: owner,
  })

  test("exactly the granted people and the owner can see it", async () => {
    const { ctx } = databaseContext()

    for (const person of [memberA, memberB, memberC, owner]) {
      expect(await sight(ctx, { personId: person }).canSee(granted)).toBe(true)
    }

    expect(await sight(ctx, { personId: memberD }).canSee(granted)).toBe(false)
  })

  test("revoking a person takes effect", async () => {
    const { ctx } = databaseContext()
    const revoked = material({
      visibility: { mode: "people", personIds: [memberA, memberB] },
      ownerId: owner,
    })

    expect(await sight(ctx, { personId: memberC }).canSee(revoked)).toBe(false)
    expect(await sight(ctx, { personId: memberA }).canSee(revoked)).toBe(true)
  })
})

describe("specific teams", () => {
  const forSales = material({
    visibility: { mode: "teams", teamIds: ["team-sales"] },
    ownerId: owner,
  })

  test("a member of a granted team sees it; a non-member does not", async () => {
    const { ctx } = databaseContext()

    expect(
      await sight(ctx, { personId: memberA, teams: ["team-sales"] }).canSee(
        forSales
      )
    ).toBe(true)
    expect(
      await sight(ctx, { personId: memberB, teams: ["team-eng"] }).canSee(
        forSales
      )
    ).toBe(false)
    expect(
      await sight(ctx, { personId: memberB, teams: [] }).canSee(forSales)
    ).toBe(false)
  })

  test("membership is read per resolution, so leaving the team revokes", async () => {
    const { ctx } = databaseContext()
    const memberships = new Set(["team-sales"])
    const before = createSight(
      ctx,
      { organizationId: "org", personId: memberA },
      { teams: () => Promise.resolve(new Set(memberships)) }
    )

    expect(await before.canSee(forSales)).toBe(true)

    memberships.delete("team-sales")

    const after = createSight(
      ctx,
      { organizationId: "org", personId: memberA },
      { teams: () => Promise.resolve(new Set(memberships)) }
    )

    expect(await after.canSee(forSales)).toBe(false)
  })
})

describe("everyone in the organization", () => {
  const table = material({ visibility: { mode: "organization" } })

  test("any member sees it; no outsider does", async () => {
    const { ctx } = databaseContext()

    expect(await sight(ctx, { personId: memberD }).canSee(table)).toBe(true)
    // An organization-principal execution counts as a member.
    expect(await sight(ctx, {}).canSee(table)).toBe(true)
    expect(
      await createSight(ctx, {
        organizationId: "elsewhere",
        personId: memberD,
      }).canSee(table)
    ).toBe(false)
  })
})
