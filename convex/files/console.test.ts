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

function uploadedBlob() {
  return { get: vi.fn(async () => ({ contentType: "text/csv", size: 42 })) }
}

test("records console uploads with storage metadata and defaults", async () => {
  const insert = vi.fn(async () => fileId)
  const ctx = fileContext({
    insert,
    system: uploadedBlob(),
  })

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
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
})

test("uploads stamp the folder when creation names one", async () => {
  const folderId = "folder-id" as Id<"folders">
  const insert = vi.fn(async () => fileId)
  const ctx = fileContext({
    insert,
    get: vi.fn(async () => ({
      _id: folderId,
      organizationId: "organization",
      visibility: { mode: "organization" },
    })),
    system: uploadedBlob(),
  })

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
  const ctx = fileContext({
    insert: vi.fn(),
    get: vi.fn(async () => ({ _id: folderId, organizationId: "elsewhere" })),
    system: uploadedBlob(),
  })

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization", personId: owner },
      { storageId, name: "costs.csv", folderId }
    )
  ).rejects.toThrow("Folder was not found.")
})

test("private uploads require a resolvable owner", async () => {
  const ctx = fileContext({ system: { get: vi.fn() } })

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
  const ctx = fileContext(
    {
      get: vi.fn(async () => organizationFile()),
      delete: rowDelete,
      query: (table: string) =>
        table === "shares"
          ? { withIndex: () => ({ take: async () => shares }) }
          : workspaceQuery(table),
    },
    { delete: storageDelete }
  )

  await removeFileWithBlob(ctx, { organizationId: "organization" }, fileId)

  expect(storageDelete).toHaveBeenCalledWith(storageId)
  expect(rowDelete).toHaveBeenCalledWith(fileId)
  expect(rowDelete).toHaveBeenCalledWith("shares:1")
})

test("replacing content swaps the blob and updates the row", async () => {
  const nextStorageId = "storage-next" as Id<"_storage">
  const storageDelete = vi.fn(async () => undefined)
  const patch = vi.fn(async () => undefined)
  const ctx = fileContext(
    {
      get: vi.fn(async () => organizationFile()),
      patch,
      system: { get: vi.fn(async () => ({ size: 99 })) },
    },
    { delete: storageDelete }
  )

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
  const ctx = fileContext(
    {
      get: vi.fn(async () => personalFile()),
      patch: vi.fn(),
      system: { get: vi.fn(async () => null) },
    },
    { delete: vi.fn() }
  )

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
  const ctx = fileContext(
    {
      get: vi.fn(async () => personalFile()),
      delete: vi.fn(),
      patch: vi.fn(),
    },
    { delete: vi.fn() }
  )
  const stranger = { organizationId: "organization", personId: other }

  await expect(removeFileWithBlob(ctx, stranger, fileId)).rejects.toThrow(
    "File was not found"
  )
  await expect(
    patchFileDetails(ctx, stranger, { fileId, name: "renamed.txt" })
  ).rejects.toThrow("File was not found")
})

test("renames normalize the name", async () => {
  const patch = vi.fn(async () => undefined)
  const ctx = fileContext({
    get: vi.fn(async () => organizationFile()),
    patch,
  })

  await patchFileDetails(
    ctx,
    { organizationId: "organization", personId: owner },
    { fileId, name: "  drafts/renamed.txt " }
  )

  expect(patch).toHaveBeenCalledWith(fileId, {
    name: "renamed.txt",
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

  expect(row).toMatchObject({ source: "run", runId, ownerName: undefined })
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

function workspaceQuery(table: string) {
  if (table === "files") {
    return { withIndex: () => ({ first: async () => null }) }
  }
  if (table !== "workspaceRetention") {
    throw new Error(`Unexpected table in file fixture: ${table}`)
  }
  return { withIndex: () => ({ unique: async () => null }) }
}

function fileContext(db: object, storage?: object) {
  return {
    db: { query: workspaceQuery, ...db },
    storage,
  } as unknown as MutationCtx
}
