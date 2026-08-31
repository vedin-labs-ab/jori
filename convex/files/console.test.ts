import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { toConsoleRow } from "./console"
import {
  insertUploadedFile,
  patchFileDetails,
  removeFileWithBlob,
  swapFileBlob,
} from "./records"

const owner = "person-owner" as Id<"persons">
const other = "person-other" as Id<"persons">
const storageId = "storage-id" as Id<"_storage">
const fileId = "file-id" as Id<"files">

/** Storage metadata for an uploaded blob, as ctx.db.system reads it. */
function uploadedBlob() {
  return { get: vi.fn(async () => ({ contentType: "text/csv", size: 42 })) }
}

test("records console uploads with storage metadata and defaults", async () => {
  const insert = vi.fn(async () => fileId)
  const ctx = {
    db: {
      insert,
      system: uploadedBlob(),
    },
  } as unknown as MutationCtx

  await insertUploadedFile(
    ctx,
    { organizationId: "organization", personId: owner },
    { storageId, name: "exports/costs.csv" }
  )

  expect(insert).toHaveBeenCalledWith("files", {
    organizationId: "organization",
    visibility: { mode: "organization" },
    ownerId: owner,
    folderId: undefined,
    storageId,
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    description: undefined,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
})

test("uploads stamp the folder when creation names one", async () => {
  const folderId = "folder-id" as Id<"folders">
  const insert = vi.fn(async () => fileId)
  const ctx = {
    db: {
      insert,
      get: vi.fn(async () => ({
        _id: folderId,
        organizationId: "organization",
        visibility: { mode: "organization" },
      })),
      system: uploadedBlob(),
    },
  } as unknown as MutationCtx

  await insertUploadedFile(
    ctx,
    { organizationId: "organization", personId: owner },
    { storageId, name: "costs.csv", folderId }
  )

  expect(insert).toHaveBeenCalledWith(
    "files",
    expect.objectContaining({ folderId })
  )
})

test("uploads reject a folder from another organization", async () => {
  const folderId = "folder-id" as Id<"folders">
  const ctx = {
    db: {
      insert: vi.fn(),
      get: vi.fn(async () => ({ _id: folderId, organizationId: "elsewhere" })),
      system: uploadedBlob(),
    },
  } as unknown as MutationCtx

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization", personId: owner },
      { storageId, name: "costs.csv", folderId }
    )
  ).rejects.toThrow("Folder was not found.")
})

test("private uploads require a resolvable owner", async () => {
  const ctx = {
    db: { system: { get: vi.fn() } },
  } as unknown as MutationCtx

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization" },
      { storageId, name: "note.txt", visibility: { mode: "private" } }
    )
  ).rejects.toThrow("Private files need a resolvable owner")
})

test("deleting a file takes its blob and share links with the row", async () => {
  const storageDelete = vi.fn(async () => undefined)
  const rowDelete = vi.fn(async () => undefined)
  const shares = [{ _id: "shares:1" }]
  const ctx = {
    db: {
      get: vi.fn(async () => organizationFile()),
      delete: rowDelete,
      query: () => ({ withIndex: () => ({ take: async () => shares }) }),
    },
    storage: { delete: storageDelete },
  } as unknown as MutationCtx

  await removeFileWithBlob(ctx, { organizationId: "organization" }, fileId)

  expect(storageDelete).toHaveBeenCalledWith(storageId)
  expect(rowDelete).toHaveBeenCalledWith(fileId)
  expect(rowDelete).toHaveBeenCalledWith("shares:1")
})

test("replacing content swaps the blob and updates the row", async () => {
  const nextStorageId = "storage-next" as Id<"_storage">
  const storageDelete = vi.fn(async () => undefined)
  const patch = vi.fn(async () => undefined)
  const ctx = {
    db: {
      get: vi.fn(async () => organizationFile()),
      patch,
      system: { get: vi.fn(async () => ({ size: 99 })) },
    },
    storage: { delete: storageDelete },
  } as unknown as MutationCtx

  await swapFileBlob(
    ctx,
    { organizationId: "organization", personId: owner },
    { fileId, storageId: nextStorageId }
  )

  expect(storageDelete).toHaveBeenCalledWith(storageId)
  expect(patch).toHaveBeenCalledWith(fileId, {
    storageId: nextStorageId,
    size: 99,
    updatedAt: expect.any(Number),
  })
})

test("replacing content rejects a missing upload and hidden files", async () => {
  const nextStorageId = "storage-next" as Id<"_storage">
  const ctx = {
    db: {
      get: vi.fn(async () => personalFile()),
      patch: vi.fn(),
      system: { get: vi.fn(async () => null) },
    },
    storage: { delete: vi.fn() },
  } as unknown as MutationCtx

  await expect(
    swapFileBlob(
      ctx,
      { organizationId: "organization", personId: other },
      { fileId, storageId: nextStorageId }
    )
  ).rejects.toThrow("File was not found")
  await expect(
    swapFileBlob(
      ctx,
      { organizationId: "organization", personId: owner },
      { fileId, storageId: nextStorageId }
    )
  ).rejects.toThrow("Uploaded file was not found in storage")
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

test("console rows name the uploading person as the owner", async () => {
  const ctx = {
    db: {
      query: vi.fn(() => ({
        withIndex: () => ({
          collect: async () => [{ provider: "slack", name: "Ada Lovelace" }],
        }),
      })),
    },
    storage: { getUrl: vi.fn(async () => "https://files.example/costs.csv") },
  } as unknown as QueryCtx

  const row = await toConsoleRow(ctx, { ...organizationFile(), ownerId: owner })

  expect(row).toMatchObject({
    source: "upload",
    ownerName: "Ada Lovelace",
    url: "https://files.example/costs.csv",
    updatedAt: 0,
  })
})

test("agent-saved rows carry run provenance and no owner name", async () => {
  const ctx = {
    storage: { getUrl: vi.fn(async () => null) },
  } as unknown as QueryCtx
  const runId = "run-id" as Id<"runs">

  const row = await toConsoleRow(ctx, { ...organizationFile(), runId })

  expect(row.source).toBe("run")
  expect(row.runId).toBe(runId)
  expect(row.ownerName).toBeUndefined()
})

function organizationFile(): Doc<"files"> {
  return {
    _id: fileId,
    _creationTime: 0,
    organizationId: "organization",
    visibility: { mode: "organization" },
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
    visibility: { mode: "private" },
    ownerId: owner,
  } as Doc<"files">
}
