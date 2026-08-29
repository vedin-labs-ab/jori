// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { FileDropzone } from "./dropzone"
import { UploadList } from "./list"
import { useUploadQueue } from "./queue"

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
