import { beforeEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { withOwnerDisplay } from "../persons/names"
import { deleteBlob, requireUnusedUpload } from "./blobs"
import { toConsoleRow } from "./console"
import {
  insertUploadedFile,
  patchFileDetails,
  removeFileWithBlob,
  swapFileBlob,
} from "./records"

vi.mock("../discovery/sync/intent")
vi.mock("./blobs", () => ({
  blobUrl: vi.fn(async () => "https://files.example/costs.csv"),
  deleteBlob: vi.fn(async () => undefined),
  requireUnusedUpload: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requireUnusedUpload).mockResolvedValue({ mimeType: "text/csv" })
})

const owner = "person-owner" as Id<"persons">
const other = "person-other" as Id<"persons">
const blobKey = "organization/blob"
const fileId = "file-id" as Id<"files">
const folderId = "folder-id" as Id<"folders">
const nextBlobKey = "organization/next"

test("records console uploads with storage metadata and defaults", async () => {
  const insert = vi.fn(async () => fileId)
  const ctx = fileContext({ insert })

  await insertUploadedFile(
    ctx,
    { organizationId: "organization", personId: owner },
    { key: blobKey, size: 42, name: "exports/costs.csv" }
  )

  expect(insert).toHaveBeenCalledWith("files", {
    organizationId: "organization",
    visibility: { mode: "organization" },
    ownerId: owner,
    folderId: undefined,
    blobKey,
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  })
})

test("uploads stamp the folder when creation names one", async () => {
  const insert = vi.fn(async () => fileId)
  const ctx = fileContext({
    insert,
    get: vi.fn(async () => ({
      _id: folderId,
      organizationId: "organization",
      visibility: { mode: "organization" },
    })),
  })

  await insertUploadedFile(
    ctx,
    { organizationId: "organization", personId: owner },
    { key: blobKey, size: 42, name: "costs.csv", folderId }
  )

  expect(insert).toHaveBeenCalledWith(
    "files",
    expect.objectContaining({ folderId })
  )
})

test("uploads reject a folder from another organization", async () => {
  const ctx = fileContext({
    insert: vi.fn(),
    get: vi.fn(async () => ({ _id: folderId, organizationId: "elsewhere" })),
  })

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization", personId: owner },
      { key: blobKey, size: 42, name: "costs.csv", folderId }
    )
  ).rejects.toThrow("Folder was not found.")
})

test("deleting a file takes its blob and share links with the row", async () => {
  const rowDelete = vi.fn(async () => undefined)
  const shares = [{ _id: "shares:1" }]
  const ctx = fileContext({
    get: vi.fn(async () => organizationFile()),
    delete: rowDelete,
    query: (table: string) =>
      table === "shares"
        ? { withIndex: () => ({ take: async () => shares }) }
        : workspaceQuery(table),
  })

  await removeFileWithBlob(ctx, { organizationId: "organization" }, fileId)

  expect(deleteBlob).toHaveBeenCalledWith(ctx, blobKey)
  expect(rowDelete).toHaveBeenCalledWith(fileId)
  expect(rowDelete).toHaveBeenCalledWith("shares:1")
})

test("replacing content swaps the blob and updates the row", async () => {
  const patch = vi.fn(async () => undefined)
  const ctx = fileContext({
    get: vi.fn(async () => organizationFile()),
    patch,
  })

  await swapFileBlob(
    ctx,
    { organizationId: "organization", personId: owner },
    { fileId, key: nextBlobKey, size: 99 }
  )

  expect(deleteBlob).toHaveBeenCalledWith(ctx, blobKey)
  expect(patch).toHaveBeenCalledWith(fileId, {
    blobKey: nextBlobKey,
    size: 99,
    updatedAt: expect.any(Number),
  })
})

test("replacing content rejects a missing upload and hidden files", async () => {
  const ctx = fileContext({
    get: vi.fn(async () => personalFile()),
    patch: vi.fn(),
  })
  vi.mocked(requireUnusedUpload).mockRejectedValue(
    new Error("Uploaded file was not found in storage")
  )

  await expect(
    swapFileBlob(
      ctx,
      { organizationId: "organization", personId: other },
      { fileId, key: nextBlobKey, size: 99 }
    )
  ).rejects.toThrow("File was not found")
  await expect(
    swapFileBlob(
      ctx,
      { organizationId: "organization", personId: owner },
      { fileId, key: nextBlobKey, size: 99 }
    )
  ).rejects.toThrow("Uploaded file was not found in storage")
})

test("editing and deleting respect personal-file visibility", async () => {
  const ctx = fileContext({
    get: vi.fn(async () => personalFile()),
    delete: vi.fn(),
    patch: vi.fn(),
  })
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
  } as unknown as QueryCtx

  const row = await withOwnerDisplay(
    ctx,
    await toConsoleRow({ ...organizationFile(), ownerId: owner })
  )

  expect(row).toMatchObject({
    source: "upload",
    ownerName: "Ada Lovelace",
    url: "https://files.example/costs.csv",
    updatedAt: 0,
  })
})

test("agent-saved rows carry run provenance and no owner name", async () => {
  const ctx = {} as unknown as QueryCtx
  const runId = "run-id" as Id<"runs">

  const row = await withOwnerDisplay(
    ctx,
    await toConsoleRow({ ...organizationFile(), runId })
  )

  expect(row).toMatchObject({ source: "run", runId, ownerName: undefined })
})

function organizationFile(): Doc<"files"> {
  return {
    _id: fileId,
    _creationTime: 0,
    organizationId: "organization",
    visibility: { mode: "organization" },
    blobKey,
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

function fileContext(db: object) {
  return { db: { query: workspaceQuery, ...db } } as unknown as MutationCtx
}
