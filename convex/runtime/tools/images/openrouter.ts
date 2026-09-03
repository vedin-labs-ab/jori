import { Buffer } from "node:buffer"
import { isRecord } from "../../../contracts/json"
import {
  type OpenRouterRuntimeConfig,
  requireOpenRouterRuntimeConfig,
} from "../../openrouter"

type GeneratedImage = {
  bytes: Uint8Array
  mimeType: string
  model: string
  requestId: string
}

const defaultImageModel = "google/gemini-3.1-flash-image"
const openRouterChatCompletionsUrl =
  "https://openrouter.ai/api/v1/chat/completions"

export async function generateOpenRouterImage(
  prompt: string
): Promise<GeneratedImage> {
  const response = await fetch(openRouterChatCompletionsUrl, {
    body: JSON.stringify(openRouterImageRequest(prompt)),
    headers: openRouterHeaders(requireOpenRouterRuntimeConfig()),
    method: "POST",
  })
  const result = await response.json().catch(() => null)
  const requestId = openRouterRequestId(response, result)

  if (!response.ok) {
    throw new Error(openRouterErrorMessage(result))
  }

  return {
    ...(await readImageData(readGeneratedImageUrl(result))),
    model: readResponseModel(result),
    requestId,
  }
}

function openRouterImageRequest(prompt: string) {
  return {
    messages: [{ content: prompt, role: "user" }],
    modalities: ["image", "text"],
    model: defaultImageModel,
    provider: { require_parameters: true, sort: "price" },
    usage: { include: true },
  }
}

function openRouterHeaders(config: OpenRouterRuntimeConfig) {
  return {
    authorization: `Bearer ${config.apiKey}`,
    "content-type": "application/json",
    ...(config.appUrl === undefined ? {} : { "HTTP-Referer": config.appUrl }),
    "X-Title": config.appName,
  }
}

async function readImageData(url: string) {
  if (url.startsWith("data:")) {
    return decodeDataUrl(url)
  }

  if (!url.startsWith("https://")) {
    throw new Error("OpenRouter returned an unsupported image URL.")
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Generated image download failed.")
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? "image/png",
  }
}

function decodeDataUrl(url: string) {
  const match = url.match(/^data:([^;,]+);base64,(.+)$/)

  if (match === null) {
    throw new Error("OpenRouter returned an invalid image data URL.")
  }

  return {
    bytes: new Uint8Array(Buffer.from(match[2], "base64")),
    mimeType: match[1],
  }
}

function readGeneratedImageUrl(value: unknown) {
  const choices = readArrayField(value, "choices")
  const choice = choices.find(isRecord)
  const message = choice === undefined ? undefined : readRecord(choice.message)
  const images = message === undefined ? undefined : readArray(message.images)
  const image = images?.find(isRecord)
  const imageUrl = image === undefined ? undefined : readImageUrl(image)

  if (imageUrl === undefined) {
    throw new Error("OpenRouter did not return a generated image.")
  }

  return imageUrl
}

function readImageUrl(image: Record<string, unknown>) {
  const snake = readRecord(image.image_url)
  const camel = readRecord(image.imageUrl)
  const imageUrl = snake ?? camel

  return typeof imageUrl?.url === "string" ? imageUrl.url : undefined
}

function readResponseModel(value: unknown) {
  if (isRecord(value) && typeof value.model === "string") {
    return value.model
  }

  return defaultImageModel
}

function openRouterRequestId(response: Response, result: unknown) {
  const header =
    response.headers.get("x-request-id") ??
    response.headers.get("x-openrouter-request-id")

  if (header !== null && header.trim() !== "") {
    return header
  }

  return isRecord(result) && typeof result.id === "string"
    ? result.id
    : "unknown"
}

function openRouterErrorMessage(value: unknown) {
  if (isRecord(value)) {
    const error = readRecord(value.error)

    if (typeof error?.message === "string") {
      return error.message
    }
  }

  return "OpenRouter image generation failed."
}

function readArrayField(value: unknown, name: string) {
  if (!isRecord(value)) {
    return []
  }

  return readArray(value[name]) ?? []
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : undefined
}

function readRecord(value: unknown) {
  return isRecord(value) ? value : undefined
}
