import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { canViewFile } from "./data"

const owner = "person-owner" as Id<"persons">
const other = "person-other" as Id<"persons">

const { ctx } = databaseContext()

test("organization files are visible to every member", async () => {
  const file = fakeFile({ visibility: { mode: "organization" } })

  expect(await canViewFile(ctx, file, { organizationId: "organization" })).toBe(
    true
  )
  expect(
    await canViewFile(ctx, file, {
      organizationId: "organization",
      personId: other,
    })
  ).toBe(true)
})

test("private files are visible to their owner only", async () => {
  const file = fakeFile({ visibility: { mode: "private" }, ownerId: owner })

  expect(
    await canViewFile(ctx, file, {
      organizationId: "organization",
      personId: owner,
    })
  ).toBe(true)
  expect(
    await canViewFile(ctx, file, {
      organizationId: "organization",
      personId: other,
    })
  ).toBe(false)
  expect(await canViewFile(ctx, file, { organizationId: "organization" })).toBe(
    false
  )
})

test("files never cross organizations, whatever the visibility", async () => {
  const file = fakeFile({ visibility: { mode: "organization" } })

  expect(
    await canViewFile(ctx, file, { organizationId: "another-organization" })
  ).toBe(false)
  expect(
    await canViewFile(
      ctx,
      fakeFile({ visibility: { mode: "private" }, ownerId: owner }),
      {
        organizationId: "another-organization",
        personId: owner,
      }
    )
  ).toBe(false)
})

function fakeFile(overrides: Partial<Doc<"files">>): Doc<"files"> {
  return {
    _id: "file-id",
    _creationTime: 0,
    organizationId: "organization",
    blobKey: "organization/blob",
    name: "report.pdf",
    mimeType: "application/pdf",
    size: 5,
    createdAt: 0,
    updatedAt: 0,
    visibility: { mode: "organization" },
    ...overrides,
  } as Doc<"files">
}
