import { expect, test, vi } from "vitest"
import { createRuntime } from "../../../../test/runtime"
import { type AgentRuntime } from "../../platform"
import { type SandboxRuntime } from "../../sandbox/types"
import { generateImageFile } from "./index"

const openRouter = vi.hoisted(() => ({
  generateOpenRouterImage: vi.fn(),
}))

vi.mock("./openrouter", () => ({
  generateOpenRouterImage: openRouter.generateOpenRouterImage,
}))

const imageBytes = new TextEncoder().encode("jori-image")

test("generates an image through OpenRouter and saves it as a file", async () => {
  openRouter.generateOpenRouterImage.mockResolvedValue({
    bytes: imageBytes,
    mimeType: "image/png",
    model: "google/gemini-3.1-flash-image",
    requestId: "generation_1",
  })
  const runtime = imageRuntime()

  const result = await generateImageFile(runtime, {
    prompt: "A clean product hero image for Jori.",
    save: { name: "hero" },
  })

  expect(openRouter.generateOpenRouterImage).toHaveBeenCalledWith(
    "A clean product hero image for Jori."
  )
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
  expect(result).toEqual({
    image: {
      fileId: "file_1",
      mimeType: "image/png",
      model: "google/gemini-3.1-flash-image",
      name: "file.png",
      path: "generated-images/hero.png",
      size: 1,
      url: null,
    },
    provider: {
      name: "openrouter",
      requestId: "generation_1",
    },
    status: "ok",
  })
})

test("returns a repairable error when OpenRouter produces no image", async () => {
  openRouter.generateOpenRouterImage.mockRejectedValue(
    new Error("OpenRouter did not return a generated image.")
  )

  await expect(
    generateImageFile(imageRuntime(), { prompt: "Create a launch image." })
  ).rejects.toThrow("OpenRouter did not return a generated image.")
})

function imageRuntime(): AgentRuntime {
  return createRuntime({
    sandbox: {
      writeFiles: vi.fn(async () => undefined),
    } as unknown as SandboxRuntime,
  })
}
