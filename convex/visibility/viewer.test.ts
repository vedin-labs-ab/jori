import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { teamIdsOf, withinOrganizationTeams } from "./viewer"

const person = "persons:member" as Id<"persons">

test("collects team ids from membership rows", () => {
  expect(
    teamIdsOf([
      { teamId: "team-a" },
      { teamId: "team-b" },
      { teamId: "team-a" },
    ])
  ).toEqual(new Set(["team-a", "team-b"]))
})

test("a candidate grant keeps only this organization's own teams", () => {
  const ours = new Set(["team-sales"])

  // A team id from another organization contributes nothing, so the draft
  // resolves exactly as an empty grant does — it cannot be used to ask
  // whether anyone here belongs to a team elsewhere.
  expect(
    withinOrganizationTeams(
      { mode: "teams", teamIds: ["team-sales", "team-elsewhere"] },
      ours
    )
  ).toEqual({ mode: "teams", teamIds: ["team-sales"] })
  expect(
    withinOrganizationTeams(
      { mode: "teams", teamIds: ["team-elsewhere"] },
      ours
    )
  ).toEqual({ mode: "teams", teamIds: [] })
})

test("grants that name no teams are left alone", () => {
  const ours = new Set(["team-sales"])

  expect(withinOrganizationTeams({ mode: "organization" }, ours)).toEqual({
    mode: "organization",
  })
  expect(
    withinOrganizationTeams({ mode: "people", personIds: [person] }, ours)
  ).toEqual({ mode: "people", personIds: [person] })
})
