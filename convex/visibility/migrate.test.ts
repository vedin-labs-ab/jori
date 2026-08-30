import { expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, fileDoc } from "../../test/convex/folders"
import { backfillStep } from "./migrate"

test("stamps visibility from the legacy scope and clears it", async () => {
  const { database, ctx } = databaseContext()
  const personalId = await database.insert(
    "collections",
    tableDoc({ scope: "personal" })
  )
  const organizationId = await database.insert(
    "collections",
    tableDoc({ scope: "organization" })
  )
  const unscopedId = await database.insert(
    "collections",
    tableDoc({ scope: undefined })
  )
  const stampedId = await database.insert(
    "collections",
    tableDoc({ scope: undefined, visibility: { mode: "public" } })
  )

  expect(await backfillStep(ctx, "collections", undefined)).toBeNull()

  const personal = await database.get(personalId)
  const organization = await database.get(organizationId)

  expect(personal).toMatchObject({ visibility: { mode: "private" } })
  expect(personal?.scope).toBeUndefined()
  expect(organization).toMatchObject({ visibility: { mode: "organization" } })
  expect(organization?.scope).toBeUndefined()
  expect(await database.get(unscopedId)).toMatchObject({
    visibility: { mode: "organization" },
  })
  // Already-stamped rows keep their visibility untouched.
  expect(await database.get(stampedId)).toMatchObject({
    visibility: { mode: "public" },
  })
})

test("sweeps files and automations the same way", async () => {
  const { database, ctx } = databaseContext()
  const fileId = await database.insert("files", fileDoc({ scope: "personal" }))
  const automationId = await database.insert(
    "automations",
    automationDoc({
      scope: "personal",
      principal: { kind: "person", personId: testOwner },
    })
  )

  expect(await backfillStep(ctx, "files", undefined)).toBeNull()
  expect(await backfillStep(ctx, "automations", undefined)).toBeNull()

  expect(await database.get(fileId)).toMatchObject({
    visibility: { mode: "private" },
  })
  expect(await database.get(automationId)).toMatchObject({
    visibility: { mode: "private" },
  })
})
