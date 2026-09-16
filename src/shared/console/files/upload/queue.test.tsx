// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { FileDropzone } from "./dropzone"
import { UploadList } from "./list"
import { type UploadAction, useFileUpload, useUploadQueue } from "./queue"

afterEach(cleanup)

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
function renderUploadHarness(upload: UploadAction) {
  const onUploaded = vi.fn()

  function Harness() {
    const state = useFileUpload(upload, null, onUploaded)

    return (
      <>
        <FileDropzone disabled={state.isUploading} onFiles={state.addFiles} />
        <UploadList
          disabled={state.isUploading}
          items={state.items}
          onClear={state.clear}
          onRemove={state.removeFile}
        />
        <button onClick={() => void state.submit()} type="button">
          Upload
        </button>
      </>
    )
  }

  render(<Harness />)

  return onUploaded
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
  test("picked files land as queued rows without duplicating a re-picked file", () => {
    const { notes, photo } = makeFiles()

    renderHarness()
    pickFiles([notes])

    expect(screen.getByText("notes.txt")).toBeDefined()

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
  test("each file goes to the host's upload in order, then the queue clears", async () => {
    const { notes, photo } = makeFiles()
    const upload = vi.fn<UploadAction>(() => Promise.resolve())

    const onUploaded = renderUploadHarness(upload)
    pickFiles([notes, photo])
    fireEvent.click(screen.getByText("Upload"))

    await waitFor(() => expect(onUploaded).toHaveBeenCalled())

    expect(upload.mock.calls.map(([file]) => file.name)).toEqual([
      "notes.txt",
      "photo.png",
    ])
    expect(upload.mock.calls[0]?.[1]).toEqual({
      folderId: null,
      visibility: { mode: "organization" },
    })
    expect(screen.queryByText("notes.txt")).toBeNull()
  })

  test("a failed file stays queued as failed and the rest still land", async () => {
    const { notes, photo } = makeFiles()
    const upload = vi.fn<UploadAction>((file) =>
      file.name === "notes.txt"
        ? Promise.reject(new Error("storage down"))
        : Promise.resolve()
    )

    const onUploaded = renderUploadHarness(upload)
    pickFiles([notes, photo])
    fireEvent.click(screen.getByText("Upload"))

    await waitFor(() => expect(screen.getByText("Upload failed")).toBeDefined())

    expect(onUploaded).not.toHaveBeenCalled()
    expect(screen.getByText("photo.png")).toBeDefined()

    // A retry re-runs only what failed.
    fireEvent.click(screen.getByText("Upload"))

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(3))

    expect(upload.mock.calls[2]?.[0].name).toBe("notes.txt")
  })
})
