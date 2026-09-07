// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob(
  "/convex/{_generated,folders,persons}/**/*.{ts,js}"
)
const organizationId = "new-organization"

test("the console's first folder query requires committed identity initialization", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({
    org: organizationId,
    subject: "new-member",
    email: "member@example.com",
  })

  await expect(
    caller.query(api.folders.console.tree, { organizationId })
  ).rejects.toThrow("Your Jori identity is still syncing")
  await caller.mutation(api.persons.account.sync, {
    organizationId,
    timezone: "Europe/Stockholm",
  })
  await expect(
    caller.query(api.folders.console.tree, { organizationId })
  ).resolves.toEqual({ status: "ready", folders: [] })

  // A retry is safe and cannot create another account person.
  await caller.mutation(api.persons.account.sync, { organizationId })
  const persons = await t.run((ctx) => ctx.db.query("persons").take(2))
  expect(persons).toHaveLength(1)
  expect(persons[0]).toMatchObject({
    organizationId,
    timezone: "Europe/Stockholm",
  })
})

test("initialization cannot create a person in another organization", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: "another-organization" })

  await expect(
    caller.mutation(api.persons.account.sync, { organizationId })
  ).rejects.toThrow("another organization")
  expect(await t.run((ctx) => ctx.db.query("persons").take(1))).toEqual([])
})
