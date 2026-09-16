// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useUploadAction } from "./upload"

const uploads = vi.hoisted(() => ({
  createFile: vi.fn(),
  generateUploadUrl: vi.fn(),
  uploadToStorage: vi.fn(),
}))

vi.mock("convex/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("convex/react")>()
  const { getFunctionName } = await import("convex/server")

  return {
    ...original,
    useMutation: (reference: Parameters<typeof original.useMutation>[0]) =>
      getFunctionName(reference).endsWith(":create")
        ? uploads.createFile
        : uploads.generateUploadUrl,
  }
})

vi.mock("./storage", () => ({
  uploadToStorage: uploads.uploadToStorage,
}))

afterEach(cleanup)

beforeEach(() => {
  uploads.createFile.mockReset().mockResolvedValue(null)
  uploads.generateUploadUrl.mockReset().mockResolvedValue("https://upload.test")
  uploads.uploadToStorage.mockReset().mockResolvedValue("storage-1")
})

test("a file goes to storage, then lands as a row with the batch's fields", async () => {
  const { result } = renderHook(() => useUploadAction("org-1"))
  const notes = new File(["notes"], "notes.txt", { type: "text/plain" })

  await result.current(notes, {
    folderId: "folder-1",
    visibility: { mode: "private" },
  })

  expect(uploads.generateUploadUrl).toHaveBeenCalledWith({
    organizationId: "org-1",
  })
  expect(uploads.uploadToStorage).toHaveBeenCalledWith(
    "https://upload.test",
    notes
  )
  expect(uploads.createFile).toHaveBeenCalledWith({
    organizationId: "org-1",
    storageId: "storage-1",
    name: "notes.txt",
    visibility: { mode: "private" },
    folderId: "folder-1",
  })
})

test("no folder means the row files at the root", async () => {
  const { result } = renderHook(() => useUploadAction("org-1"))

  await result.current(new File(["x"], "x.txt"), {
    folderId: null,
    visibility: { mode: "organization" },
  })

  expect(uploads.createFile.mock.calls[0]?.[0].folderId).toBeUndefined()
})
