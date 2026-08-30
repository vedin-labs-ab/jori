import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { loadAuthUserIds, teamIdsOf } from "./viewer"

const person = "persons:member" as Id<"persons">

test("resolves a person to their auth user ids in this organization", async () => {
  const { database, ctx } = databaseContext()
  const identity = {
    personId: person,
    provider: "auth",
    externalId: "user-1",
    link: { method: "oauth", linkedAt: 1 },
    createdAt: 1,
    updatedAt: 1,
  }

  await database.insert("identities", { ...identity, organizationId: "org" })
  await database.insert("identities", {
    ...identity,
    organizationId: "org",
    provider: "slack",
    externalId: "U123",
  })
  await database.insert("identities", {
    ...identity,
    organizationId: "elsewhere",
    externalId: "user-2",
  })

  expect(
    await loadAuthUserIds(ctx, { organizationId: "org", personId: person })
  ).toEqual(["user-1"])
})

test("collects team ids from membership rows", () => {
  expect(
    teamIdsOf([
      { teamId: "team-a" },
      { teamId: "team-b" },
      { teamId: "team-a" },
    ])
  ).toEqual(new Set(["team-a", "team-b"]))
})
