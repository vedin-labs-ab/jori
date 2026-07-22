import { Buffer } from "node:buffer"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type RuntimeId } from "../../../contracts/runtime/worker"
import { type ToolRuntime } from "../runtime"
import { generateImageAsset } from "./index"

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "openrouter_key")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("generates an image through OpenRouter and saves it as an asset", async () => {
  const imageBytes = new Uint8Array(Buffer.from("milo-image"))
  const fetchMock = mockFetch(
    Response.json(
      {
        choices: [
          {
            message: {
              images: [
                {
                  image_url: {
                    url: `data:image/png;base64,${Buffer.from(imageBytes).toString("base64")}`,
                  },
                },
              ],
            },
          },
        ],
        id: "generation_1",
        model: "google/gemini-3.1-flash-image",
      },
      {
        headers: {
          "x-request-id": "request_1",
        },
      }
    )
  )
  const runtime = createRuntime()

  const result = await generateImageAsset(runtime.runtime, {
    prompt: "A clean product hero image for Milo.",
    save: {
      description: "Product hero",
      name: "hero",
    },
  })

  expect(openRouterRequestBody(fetchMock)).toMatchObject({
    messages: [{ content: "A clean product hero image for Milo." }],
    modalities: ["image", "text"],
    model: "google/gemini-3.1-flash-image",
  })
  expect(runtime.writeFiles).toHaveBeenCalledWith([
    {
      content: imageBytes,
      path: "/home/user/workspace/generated-images/hero.png",
    },
  ])
  expect(runtime.uploadAsset).toHaveBeenCalledWith({
    bytes: imageBytes,
    description: "Product hero",
    mimeType: "image/png",
    name: "hero.png",
    runId: "run_1",
  })
  expect(result).toEqual({
    image: {
      assetId: "asset_1",
      mimeType: "image/png",
      model: "google/gemini-3.1-flash-image",
      name: "hero.png",
      path: "generated-images/hero.png",
      size: imageBytes.byteLength,
      url: "https://example.com/hero.png",
    },
    provider: {
      name: "openrouter",
      requestId: "request_1",
    },
    status: "ok",
  })
})

test("returns a repairable error when OpenRouter produces no image", async () => {
  mockFetch(
    Response.json({
      choices: [
        {
          message: {
            content: "No image was produced.",
          },
        },
      ],
      id: "generation_1",
    })
  )

  await expect(
    generateImageAsset(createRuntime().runtime, {
      prompt: "Create a launch image.",
    })
  ).rejects.toThrow("OpenRouter did not return a generated image.")
})

type UploadAssetInput = Parameters<ToolRuntime["convex"]["uploadAsset"]>[0]
type WriteFilesInput = Parameters<ToolRuntime["sandbox"]["writeFiles"]>[0]

function createRuntime() {
  const uploadAsset = vi.fn(async (args: UploadAssetInput) => ({
    assetId: "asset_1" as RuntimeId<"assets">,
    mimeType: args.mimeType,
    name: args.name,
    size: args.bytes.byteLength,
    url: "https://example.com/hero.png",
  }))
  const writeFiles = vi.fn(async (_files: WriteFilesInput) => undefined)
  const runtime = {
    context: {
      run: {
        id: "run_1" as RuntimeId<"runs">,
      },
    },
    convex: {
      uploadAsset,
    },
    sandbox: {
      writeFiles,
    },
  } as unknown as ToolRuntime

  return {
    runtime,
    uploadAsset,
    writeFiles,
  }
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn(
    async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1]
    ) => response
  )

  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

function openRouterRequestBody(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls[0]
  const init = call?.[1]

  if (init === undefined || typeof init.body !== "string") {
    throw new Error("OpenRouter request body was not captured.")
  }

  return JSON.parse(init.body) as Record<string, unknown>
}
