import { beforeEach, expect, test, vi } from "vitest"
import { createRuntime } from "../../../../test/runtime"
import { type AgentRuntime } from "../../platform"
import { type SandboxRuntime } from "../../sandbox/types"
import { generateImageFile } from "./index"
import { generateVertexImage } from "./vertex"

vi.mock("./vertex", () => ({ generateVertexImage: vi.fn() }))
const imageBytes = new TextEncoder().encode("jori-image")
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
  expect(runtime.sandbox.writeFiles).toHaveBeenCalledWith([
    {
      content: imageBytes,
      path: "/home/user/workspace/generated-images/hero.png",
    },
  ])
  expect(runtime.platform.uploadFile).toHaveBeenCalledWith({
    bytes: imageBytes,
    mimeType: "image/png",
    name: "hero.png",
    runId: "run_1",
  })
  expect(result).toMatchObject({
    image: { model: usage.model, path: "generated-images/hero.png" },
    provider: { name: "vertex", requestId: "generation_1" },
    status: "ok",
  })
})

test("accounts for incurred usage even when the provider produces no image", async () => {
  vi.mocked(generateVertexImage).mockResolvedValue({ image: null, usage })
  const runtime = imageRuntime()
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Vertex did not return a generated image.")
  expect(runtime.platform.recordUsage).toHaveBeenCalledWith(usage)
  expect(runtime.sandbox.writeFiles).not.toHaveBeenCalled()
})

test("records the provider charge before a file write can fail", async () => {
  const runtime = imageRuntime()
  vi.mocked(runtime.sandbox.writeFiles).mockRejectedValue(
    new Error("Storage failed")
  )
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Storage failed")
  expect(runtime.platform.recordUsage).toHaveBeenCalledWith(usage)
  expect(runtime.platform.uploadFile).not.toHaveBeenCalled()
})

test("does not save an image if accounting fails", async () => {
  const runtime = imageRuntime()
  vi.mocked(runtime.platform.recordUsage).mockRejectedValue(
    new Error("Accounting failed")
  )
  await expect(
    generateImageFile(runtime, { prompt: "Create an image." })
  ).rejects.toThrow("Accounting failed")
  expect(runtime.sandbox.writeFiles).not.toHaveBeenCalled()
})

function imageRuntime(): AgentRuntime {
  return createRuntime({
    sandbox: {
      writeFiles: vi.fn(async () => undefined),
    } as unknown as SandboxRuntime,
  })
}
