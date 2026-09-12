import { isRecord } from "../../../../contracts/json"
import { base64DecodeBytes } from "../../../shared/encoding"
import { type GeneratedImage } from "../types"
import { vertexAccessToken } from "./auth"
import { imageModel, vertexConfiguration } from "./config"
import { vertexUsage } from "./usage"

type Image = NonNullable<GeneratedImage["image"]>

export async function generateVertexImage(
  prompt: string
): Promise<GeneratedImage> {
  const config = vertexConfiguration()
  const token = await vertexAccessToken(config)
  const response = await fetch(config.endpoint, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 8192,
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { imageSize: "1K" },
      },
    }),
  })
  if (!response.ok) {
    // Provider error bodies can contain customer input. Do not retain them.
    throw new Error(`Vertex image generation failed (${response.status}).`)
  }
  const result: unknown = await response.json()
  if (
    !isRecord(result) ||
    typeof result.responseId !== "string" ||
    result.responseId === ""
  ) {
    throw new Error("Vertex image response is missing its request ID.")
  }
  const image = readImage(result.candidates)
  return {
    usage: {
      provider: "vertex",
      model: `google/${imageModel}`,
      requestId: result.responseId,
      ...vertexUsage(result.usageMetadata),
    },
    image,
    ...(image === null ? { failure: imageFailure(result.candidates) } : {}),
  }
}

/** Only fixed codes and counts cross the provider edge, never response text. */
function imageFailure(candidates: unknown): string {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "Vertex returned no image candidates."
  }
  const reasons: string[] = []
  for (const candidate of candidates.slice(0, 3)) {
    if (!isRecord(candidate)) {
      reasons.push("invalid candidate")
      continue
    }
    const finish = imageFinishReason(candidate.finishReason)
    const parts = isRecord(candidate.content) ? candidate.content.parts : null
    reasons.push(`${finish}; ${imagePartFailure(parts)}`)
  }
  return `Vertex returned no supported image (${reasons.join(", ")}).`
}

function imagePartFailure(parts: unknown) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return "missing content parts"
  }
  const inline = parts.find(
    (part) => isRecord(part) && isRecord(part.inlineData)
  )
  if (inline === undefined) {
    return "missing inline image"
  }
  if (
    typeof inline.inlineData.data !== "string" ||
    inline.inlineData.data === ""
  ) {
    return "missing inline bytes"
  }
  return "unsupported image media type"
}

function imageFinishReason(value: unknown) {
  switch (value) {
    case "STOP":
    case "MAX_TOKENS":
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
    case "IMAGE_SAFETY":
    case "IMAGE_PROHIBITED_CONTENT":
    case "IMAGE_RECITATION":
    case "IMAGE_OTHER":
    case "NO_IMAGE":
      return value
    default:
      return "unknown finish reason"
  }
}

function readImage(candidates: unknown): Image | null {
  if (!Array.isArray(candidates)) {
    return null
  }
  for (const candidate of candidates) {
    if (
      !isRecord(candidate) ||
      !isRecord(candidate.content) ||
      !Array.isArray(candidate.content.parts)
    ) {
      continue
    }
    for (const part of candidate.content.parts) {
      const image = readPart(part)
      if (image !== null) {
        return image
      }
    }
  }
  return null
}

function readPart(part: unknown): Image | null {
  if (!isRecord(part) || !isRecord(part.inlineData)) {
    return null
  }
  const { data, mimeType } = part.inlineData
  if (
    typeof data !== "string" ||
    data === "" ||
    (mimeType !== "image/png" &&
      mimeType !== "image/jpeg" &&
      mimeType !== "image/webp")
  ) {
    return null
  }
  return { bytes: base64DecodeBytes(data), mimeType }
}
