import { unzipSync } from "fflate"
import { afterEach, expect, test, vi } from "vitest"
import { downloadFiles } from "./archive"
import { downloadBlob, downloadUrl } from "./download"

vi.mock("./download", () => ({
  downloadBlob: vi.fn(),
  downloadUrl: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const file = (name: string, size = 3) => ({
  name,
  url: `https://storage.example/${encodeURIComponent(name)}`,
  size,
})

test("multiple files produce one ZIP with exact bytes and unique safe names", async () => {
  const names = [
    "../report.txt",
    "../report.txt",
    "REPORT.txt",
    "report.txt",
    "..",
    "CON",
    "folder\\note.txt",
  ]
  const bodies = names.map((_, index) => new Uint8Array([0, index, 255]))
  let next = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(bodies[next++]))
  )

  await downloadFiles(names.map((name) => file(name)))

  expect(downloadBlob).toHaveBeenCalledTimes(1)
  const [filename, blob] = vi.mocked(downloadBlob).mock.calls[0] ?? []
  if (!blob) {
    throw new Error("No archive downloaded")
  }
  expect(filename).toBe("jori-files.zip")
  expect(blob.type).toBe("application/zip")
  const contents = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  expect(Object.keys(contents)).toEqual([
    "..-report.txt",
    "..-report (2).txt",
    "REPORT.txt",
    "report (2).txt",
    "file",
    "_CON",
    "folder-note.txt",
  ])
  expect(Object.values(contents)).toEqual(bodies)
  expect(downloadUrl).not.toHaveBeenCalled()
})

test("a failed fetch aborts the entire archive without downloading a partial result", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("one"))
      .mockResolvedValueOnce(new Response("expired", { status: 403 }))
  )

  await expect(
    downloadFiles([file("one.txt"), file("two.txt")])
  ).rejects.toThrow("could not be downloaded")
  expect(downloadBlob).not.toHaveBeenCalled()
  expect(downloadUrl).not.toHaveBeenCalled()
})

test("one file retains its original filename and download behavior", async () => {
  const selected = file("original.pdf")
  await downloadFiles([selected])
  expect(downloadUrl).toHaveBeenCalledExactlyOnceWith(
    selected.name,
    selected.url
  )
  expect(downloadBlob).not.toHaveBeenCalled()
})

test("a truncated response does not become a successful archive", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("short"))
  )
  await expect(
    downloadFiles([file("one", 10), file("two", 3)])
  ).rejects.toThrow("changed while downloading")
  expect(downloadBlob).not.toHaveBeenCalled()
})

test("oversized selections fail before fetching", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  await expect(
    downloadFiles([
      file("one", 60 * 1024 * 1024),
      file("two", 60 * 1024 * 1024),
    ])
  ).rejects.toThrow("exceed 100 MB")
  expect(fetch).not.toHaveBeenCalled()
  expect(downloadBlob).not.toHaveBeenCalled()
})

test("actual streamed bytes enforce the limit even when stored sizes are stale", async () => {
  const cancel = vi.fn()
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(100 * 1024 * 1024 + 1))
            },
            cancel,
          })
        )
    )
  )
  await expect(downloadFiles([file("one"), file("two")])).rejects.toThrow(
    "exceed 100 MB"
  )
  expect(cancel).toHaveBeenCalledOnce()
  expect(downloadBlob).not.toHaveBeenCalled()
})
