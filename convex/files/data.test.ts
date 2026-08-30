import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { canViewFile, normalizeFileName } from "./data"

const owner = "person-owner" as Id<"persons">
const other = "person-other" as Id<"persons">

const { ctx } = databaseContext()

test("organization files are visible to every member", async () => {
  const file = fakeFile({ scope: "organization" })

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

test("legacy personal scope reads as private", async () => {
  const file = fakeFile({ scope: "personal", ownerId: owner })

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
})

test("files never cross organizations, whatever the visibility", async () => {
  const file = fakeFile({ scope: "organization" })

  expect(
    await canViewFile(ctx, file, { organizationId: "another-organization" })
  ).toBe(false)
  expect(
    await canViewFile(ctx, fakeFile({ scope: "personal", ownerId: owner }), {
      organizationId: "another-organization",
      personId: owner,
    })
  ).toBe(false)
})

test("normalizes stored names to a safe single path segment", () => {
  expect(normalizeFileName("  reports/q3/summary.pdf ")).toBe("summary.pdf")
  expect(normalizeFileName("multi\nline\rname.txt")).toBe("multi line name.txt")
  expect(normalizeFileName("")).toBe("file")
  expect(normalizeFileName(null)).toBe("file")
  expect(normalizeFileName("a".repeat(200))).toHaveLength(160)
})

function fakeFile(overrides: Partial<Doc<"files">>): Doc<"files"> {
  return {
    _id: "file-id",
    _creationTime: 0,
    organizationId: "organization",
    storageId: "storage-id",
    name: "report.pdf",
    mimeType: "application/pdf",
    size: 5,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as Doc<"files">
}
