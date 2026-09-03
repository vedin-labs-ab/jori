import { type ChatResult } from "@openrouter/sdk/models"
import { sendOpenRouterChat } from "../../../model/openrouter"

type GeneratedImage = {
  bytes: Uint8Array
  mimeType: string
  model: string
  requestId: string
}

const imageModel = "google/gemini-3.1-flash-image"

export async function generateOpenRouterImage(
  prompt: string
): Promise<GeneratedImage> {
  const result = await sendOpenRouterChat({
    messages: [{ content: prompt, role: "user" }],
    modalities: ["image", "text"],
    model: imageModel,
    // Image models differ wildly in price, and the cheapest provider that
    // honours the request is good enough for a generated illustration.
    provider: { requireParameters: true, sort: "price" },
  })

  return {
    ...(await readImageData(readGeneratedImageUrl(result))),
    model: result.model,
    requestId: result.id,
  }
}

function readGeneratedImageUrl(result: ChatResult) {
  const image = result.choices[0]?.message.images?.[0]

  if (image === undefined) {
    throw new Error("OpenRouter did not return a generated image.")
  }

  return image.imageUrl.url
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
  const mimeType = match?.[1]
  const encoded = match?.[2]

  if (mimeType === undefined || encoded === undefined) {
    throw new Error("OpenRouter returned an invalid image data URL.")
  }

  return {
    bytes: Uint8Array.from(atob(encoded), (character) =>
      character.charCodeAt(0)
    ),
    mimeType,
  }
}
