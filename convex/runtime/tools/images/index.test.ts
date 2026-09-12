import { beforeEach, expect, test, vi } from "vitest"
import { toolResponseSchemas } from "../../../../contracts/tools/responses"
import { schemaViolations } from "../../../../test/convex/schema"
import { createRuntime } from "../../../../test/runtime"
import { type AgentRuntime } from "../../platform/types"
import { type SandboxRuntime } from "../../sandbox/types"
import { generateImageFile } from "./index"
import { generateVertexImage } from "./vertex"

vi.mock("./vertex", () => ({ generateVertexImage: vi.fn() }))
const imageBytes = new Uint8Array(6 * 1024 * 1024)
const usage = {
  model: "google/gemini-3.1-flash-image",
  provider: "vertex",
  requestId: "generation_1",
  micros: 73930,
  tokens: { input: 17, output: 1120 },
}

beforeEach(() => {
  vi.mocked(generateVertexImage).mockResolvedValue({
    image: { bytes: imageBytes, mimeType: "image/png" },
    usage,
  })
})

test("generates a regional image, accounts for it and saves it as a file", async () => {
  const runtime = imageRuntime()
  const result = await generateImageFile(runtime, {
    prompt: "A product hero image.",
    save: { name: "hero" },
  })
  expect(generateVertexImage).toHaveBeenCalledWith("A product hero image.")
  expect(runtime.platform.recordUsage).toHaveBeenCalledWith(usage)
  expect(runtime.sandbox.importFile).toHaveBeenCalledWith({
    fileId: "file_1",
    path: "/home/user/workspace/generated-images/hero.png",
  })
  expect(runtime.sandbox.writeFiles).not.toHaveBeenCalled()
  const upload = vi.mocked(runtime.platform.uploadFile).mock.calls[0]?.[0]
  expect(upload?.bytes).toBe(imageBytes)
  expect({ ...upload, bytes: undefined }).toEqual({
    bytes: undefined,
    mimeType: "image/png",
    name: "hero.png",
    runId: "run_1",
  })
  expect(result).toMatchObject({
    image: { model: usage.model, path: "generated-images/hero.png" },
    provider: { name: "vertex", requestId: "generation_1" },
    status: "ok",
  })
  expect(schemaViolations(result, toolResponseSchemas.generate_image)).toEqual(
    []
  )
})

test.each([
  undefined,
  "Vertex returned no supported image (IMAGE_SAFETY; missing content parts).",
])(
  "accounts for a missing image before reporting its failure: %s",
  async (failure) => {
    vi.mocked(generateVertexImage).mockResolvedValue({
      image: null,
      usage,
      failure,
    })
    const runtime = imageRuntime()
    await expect(
      generateImageFile(runtime, { prompt: "Create an image." })
    ).rejects.toThrow(failure ?? "Vertex did not return a generated image.")
    expect(runtime.platform.recordUsage).toHaveBeenCalledExactlyOnceWith(usage)
    expect(runtime.platform.uploadFile).not.toHaveBeenCalled()
    expect(runtime.sandbox.importFile).not.toHaveBeenCalled()
  }
)

test("records the provider charge before a file write can fail", async () => {
  const runtime = imageRuntime()
  vi.mocked(runtime.platform.uploadFile).mockRejectedValue(
    new Error("Storage failed")
  )
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Storage failed")
  expect(runtime.platform.recordUsage).toHaveBeenCalledWith(usage)
  expect(runtime.sandbox.importFile).not.toHaveBeenCalled()
})

test("does not save an image if accounting fails", async () => {
  const runtime = imageRuntime()
  vi.mocked(runtime.platform.recordUsage).mockRejectedValue(
    new Error("Accounting failed")
  )
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Accounting failed")
  expect(runtime.sandbox.importFile).not.toHaveBeenCalled()
  expect(runtime.platform.uploadFile).not.toHaveBeenCalled()
})

test("retains the saved file and charge when the sandbox copy fails", async () => {
  const runtime = imageRuntime()
  vi.mocked(runtime.sandbox.importFile).mockRejectedValue(
    new Error("Sandbox failed")
  )
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Sandbox failed")
  expect(runtime.platform.recordUsage).toHaveBeenCalledExactlyOnceWith(usage)
  expect(runtime.platform.uploadFile).toHaveBeenCalledTimes(1)
})

function imageRuntime(): AgentRuntime {
  return createRuntime({
    sandbox: {
      writeFiles: vi.fn(async () => undefined),
      importFile: vi.fn(async () => undefined),
    } as unknown as SandboxRuntime,
  })
}
