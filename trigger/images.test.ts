import { Buffer } from "node:buffer"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { generateImageAttachment } from "./images/index"
import { type ToolRuntime } from "./tool"
import { type ConvexId } from "./types"

const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "openrouter_key"
})

afterEach(() => {
  restoreEnvironmentVariable("OPENROUTER_API_KEY", originalOpenRouterApiKey)
  vi.unstubAllGlobals()
})

test("generates an image through OpenRouter and saves it as an attachment", async () => {
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

  const result = await generateImageAttachment(runtime.runtime, {
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
      path: "/home/user/milo-workspace/generated-images/hero.png",
    },
  ])
  expect(runtime.uploadAttachment).toHaveBeenCalledWith({
    bytes: imageBytes,
    description: "Product hero",
    mimeType: "image/png",
    name: "hero.png",
    runId: "run_1",
  })
  expect(result).toEqual({
    image: {
      attachmentId: "attachment_1",
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
    generateImageAttachment(createRuntime().runtime, {
      prompt: "Create a launch image.",
    })
  ).rejects.toThrow("OpenRouter did not return a generated image.")
})

type UploadAttachmentInput = Parameters<
  ToolRuntime["convex"]["uploadAttachment"]
>[0]
type WriteFilesInput = Parameters<ToolRuntime["sandbox"]["writeFiles"]>[0]

function createRuntime() {
  const uploadAttachment = vi.fn(async (args: UploadAttachmentInput) => ({
    attachmentId: "attachment_1" as ConvexId<"attachments">,
    mimeType: args.mimeType,
    name: args.name,
    size: args.bytes.byteLength,
    url: "https://example.com/hero.png",
  }))
  const writeFiles = vi.fn(async (_files: WriteFilesInput) => undefined)
  const runtime = {
    context: {
      run: {
        id: "run_1" as ConvexId<"runs">,
      },
    },
    convex: {
      uploadAttachment,
    },
    sandbox: {
      writeFiles,
    },
  } as unknown as ToolRuntime

  return {
    runtime,
    uploadAttachment,
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

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}
