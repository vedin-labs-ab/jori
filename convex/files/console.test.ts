import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  insertUploadedFile,
  patchFileDetails,
  removeFileWithBlob,
} from "./console"

const owner = "person-owner" as Id<"persons">
const other = "person-other" as Id<"persons">
const storageId = "storage-id" as Id<"_storage">
const fileId = "file-id" as Id<"files">

test("records console uploads with storage metadata and defaults", async () => {
  const insert = vi.fn(async () => fileId)
  const ctx = {
    db: {
      insert,
      system: {
        get: vi.fn(async () => ({ contentType: "text/csv", size: 42 })),
      },
    },
  } as unknown as MutationCtx

  await insertUploadedFile(
    ctx,
    { organizationId: "organization", personId: owner },
    { storageId, name: "exports/costs.csv" }
  )

  expect(insert).toHaveBeenCalledWith("files", {
    organizationId: "organization",
    scope: "organization",
    ownerId: owner,
    storageId,
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    description: undefined,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
})

test("personal uploads require a resolvable owner", async () => {
  const ctx = {
    db: { system: { get: vi.fn() } },
  } as unknown as MutationCtx

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization" },
      { storageId, name: "note.txt", scope: "personal" }
    )
  ).rejects.toThrow("Personal files need a resolvable owner")
})

test("deleting a file deletes its storage blob with the row", async () => {
  const storageDelete = vi.fn(async () => undefined)
  const rowDelete = vi.fn(async () => undefined)
  const ctx = {
    db: {
      get: vi.fn(async () => organizationFile()),
      delete: rowDelete,
    },
    storage: { delete: storageDelete },
  } as unknown as MutationCtx

  await removeFileWithBlob(ctx, { organizationId: "organization" }, fileId)

  expect(storageDelete).toHaveBeenCalledWith(storageId)
  expect(rowDelete).toHaveBeenCalledWith(fileId)
})

test("editing and deleting respect personal-file visibility", async () => {
  const ctx = {
    db: {
      get: vi.fn(async () => personalFile()),
      delete: vi.fn(),
      patch: vi.fn(),
    },
    storage: { delete: vi.fn() },
  } as unknown as MutationCtx
  const stranger = { organizationId: "organization", personId: other }

  await expect(removeFileWithBlob(ctx, stranger, fileId)).rejects.toThrow(
    "File was not found"
  )
  await expect(
    patchFileDetails(ctx, stranger, { fileId, name: "renamed.txt" })
  ).rejects.toThrow("File was not found")
})

test("renames normalize the name and clear empty descriptions", async () => {
  const patch = vi.fn(async () => undefined)
  const ctx = {
    db: {
      get: vi.fn(async () => organizationFile()),
      patch,
    },
  } as unknown as MutationCtx

  await patchFileDetails(
    ctx,
    { organizationId: "organization", personId: owner },
    { fileId, name: "  drafts/renamed.txt ", description: "" }
  )

  expect(patch).toHaveBeenCalledWith(fileId, {
    name: "renamed.txt",
    description: undefined,
    updatedAt: expect.any(Number),
  })
})

function organizationFile(): Doc<"files"> {
  return {
    _id: fileId,
    _creationTime: 0,
    organizationId: "organization",
    scope: "organization",
    storageId,
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"files">
}

function personalFile(): Doc<"files"> {
  return {
    ...organizationFile(),
    scope: "personal",
    ownerId: owner,
  } as Doc<"files">
}
