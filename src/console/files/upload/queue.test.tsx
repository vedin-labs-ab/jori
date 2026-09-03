// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { FileDropzone } from "./dropzone"
import { UploadList } from "./list"
import { useFileUpload, useUploadQueue } from "./queue"

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

vi.mock("../storage", () => ({
  uploadToStorage: uploads.uploadToStorage,
}))

afterEach(cleanup)

beforeEach(() => {
  uploads.createFile.mockReset().mockResolvedValue(null)
  uploads.generateUploadUrl.mockReset().mockResolvedValue("https://upload.test")
  uploads.uploadToStorage.mockReset().mockResolvedValue("storage-1")
})

/** Renders the dropzone and list wired to the queue hook, as in the dialog. */
function renderHarness() {
  function Harness() {
    const queue = useUploadQueue()

    return (
      <>
        <FileDropzone disabled={false} onFiles={queue.addFiles} />
        <UploadList
          disabled={false}
          items={queue.items}
          onClear={queue.clear}
          onRemove={queue.removeFile}
        />
      </>
    )
  }

  render(<Harness />)
}

/** Renders the full upload flow wired to useFileUpload, with a plain
 *  submit button standing in for the dialog's footer. */
function renderUploadHarness() {
  function Harness() {
    const upload = useFileUpload("org-1", null, () => undefined)

    return (
      <>
        <FileDropzone disabled={upload.isUploading} onFiles={upload.addFiles} />
        <UploadList
          disabled={upload.isUploading}
          items={upload.items}
          onClear={upload.clear}
          onRemove={upload.removeFile}
        />
        <button onClick={() => void upload.submit()} type="button">
          Upload
        </button>
      </>
    )
  }

  render(<Harness />)
}

function pickFiles(files: File[]) {
  fireEvent.change(screen.getByLabelText("Add files"), { target: { files } })
}

function makeFiles() {
  return {
    notes: new File(["notes"], "notes.txt", { type: "text/plain" }),
    photo: new File(["binary"], "photo.png", { type: "image/png" }),
  }
}

describe("upload queue", () => {
  test("picked files land as queued rows", () => {
    const { notes, photo } = makeFiles()

    renderHarness()
    pickFiles([notes, photo])

    expect(screen.getByText("notes.txt")).toBeDefined()
    expect(screen.getByText("photo.png")).toBeDefined()
  })

  test("re-picking the same file keeps a single row", () => {
    const { notes, photo } = makeFiles()

    renderHarness()
    pickFiles([notes])
    pickFiles([notes, photo])

    expect(screen.getAllByText("notes.txt")).toHaveLength(1)
    expect(screen.getByText("photo.png")).toBeDefined()
  })

  test("the remove button drops only its row", () => {
    const { notes, photo } = makeFiles()

    renderHarness()
    pickFiles([notes, photo])
    fireEvent.click(screen.getByLabelText("Remove notes.txt"))

    expect(screen.queryByText("notes.txt")).toBeNull()
    expect(screen.getByText("photo.png")).toBeDefined()
  })

  test("Clear all empties the queue", () => {
    const { notes, photo } = makeFiles()

    renderHarness()
    pickFiles([notes, photo])
    fireEvent.click(screen.getByText("Clear all"))

    expect(screen.queryByText("notes.txt")).toBeNull()
    expect(screen.queryByText("photo.png")).toBeNull()
  })
})

describe("upload submission", () => {
  test("each file lands as its own create call", async () => {
    const { notes, photo } = makeFiles()

    renderUploadHarness()
    pickFiles([notes, photo])
    fireEvent.click(screen.getByText("Upload"))

    await waitFor(() => expect(uploads.createFile).toHaveBeenCalledTimes(2))

    const payloads = uploads.createFile.mock.calls.map(([args]) => args)

    expect(payloads.map((payload) => payload.name)).toEqual([
      "notes.txt",
      "photo.png",
    ])
  })
})
