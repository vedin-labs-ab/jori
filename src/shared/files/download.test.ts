// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest"
import { downloadUrl, toFilename } from "./download"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test("downloads cross-origin bytes with their filename without navigating", async () => {
  const blob = new Blob(["test file"])
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, blob: async () => blob })
  )
  const create = vi.fn().mockReturnValue("blob:download")
  const revoke = vi.fn()
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke })
  const downloads: { href: string; name: string }[] = []
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push({ href: this.href, name: this.download })
  })

  await downloadUrl(
    "report.txt",
    "https://storage.example/report?signature=test"
  )

  expect(downloads).toEqual([{ href: "blob:download", name: "report.txt" }])
  expect(create).toHaveBeenCalledWith(blob)
  expect(revoke).toHaveBeenCalledWith("blob:download")
  expect(document.querySelector("a")).toBeNull()
})

test("an expired download fails instead of saving an error document", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click")
  await expect(
    downloadUrl("report.txt", "https://storage.example/expired")
  ).rejects.toThrow("Could not download")
  expect(click).not.toHaveBeenCalled()
})

describe("toFilename", () => {
  test("appends the extension to the name", () => {
    expect(toFilename("Launch plan", "json")).toBe("Launch plan.json")
  })

  test("replaces characters unsafe in filenames", () => {
    expect(toFilename("a/b\\c:d", "csv")).toBe("a-b-c-d.csv")
  })
})
