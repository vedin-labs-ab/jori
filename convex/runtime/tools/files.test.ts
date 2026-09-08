import { expect, test, vi } from "vitest"
import { createRuntime, runtimeId } from "../../../test/runtime"
import { saveSandboxFile } from "./files"

test("save_file exports by path instead of reading bytes into the agent runtime", async () => {
  const runtime = createRuntime()
  const exportFile = vi.spyOn(runtime.sandbox, "exportFile").mockResolvedValue({
    fileId: runtimeId<"files">("files:1"),
    mimeType: "text/plain",
    name: "note.txt",
    size: 17 * 1024 * 1024,
    url: null,
  })
  const readFile = vi.spyOn(runtime.sandbox, "readFile")
  await expect(
    saveSandboxFile(runtime, { path: "note.txt" })
  ).resolves.toMatchObject({
    size: 17 * 1024 * 1024,
  })
  expect(exportFile).toHaveBeenCalledExactlyOnceWith({
    path: "/home/user/workspace/note.txt",
    name: "note.txt",
    mimeType: "text/plain",
  })
  expect(readFile).not.toHaveBeenCalled()
  expect(runtime.platform.uploadFile).not.toHaveBeenCalled()
})

test("keeps explicit names and MIME types at the export boundary", async () => {
  const runtime = createRuntime()
  const exportFile = vi
    .spyOn(runtime.sandbox, "exportFile")
    .mockRejectedValue(new Error("fixture stop"))
  await expect(
    saveSandboxFile(runtime, {
      path: "output.bin",
      name: "report.pdf",
      mimeType: "application/pdf",
    })
  ).rejects.toThrow("fixture stop")
  expect(exportFile).toHaveBeenCalledWith({
    path: "/home/user/workspace/output.bin",
    name: "report.pdf",
    mimeType: "application/pdf",
  })
})
