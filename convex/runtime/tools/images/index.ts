import { sandboxWorkspace } from "../../../../contracts/coding"
import { isRecord, type JsonObject } from "../../../../contracts/json"
import { optionalString, requiredString } from "../../../shared/input"
import { type AgentRuntime } from "../../platform"

type GenerateImageInput = {
  prompt: string
  save: {
    name?: string
  }
}

const generatedImageDirectory = "generated-images"

export async function generateImageFile(
  runtime: AgentRuntime,
  input: JsonObject
) {
  const request = normalizeGenerateImageInput(input)
  const { generateVertexImage } = await import("./vertex")
  const result = await generateVertexImage(request.prompt)
  await runtime.platform.recordUsage(result.usage)
  const generated = result.image
  if (generated === null) {
    throw new Error(
      result.failure ?? "Vertex did not return a generated image."
    )
  }
  const name = imageFileName(request.save.name, generated.mimeType)
  const workspacePath = `${generatedImageDirectory}/${name}`

  const file = await runtime.platform.uploadFile({
    bytes: generated.bytes,
    mimeType: generated.mimeType,
    name,
    runId: runtime.context.run.id,
  })

  await runtime.sandbox.importFile({
    fileId: file.fileId,
    path: `${sandboxWorkspace}/${workspacePath}`,
  })

  return {
    image: {
      ...file,
      model: result.usage.model,
      path: workspacePath,
    },
    provider: {
      name: result.usage.provider,
      requestId: result.usage.requestId,
    },
    status: "ok",
  }
}

function normalizeGenerateImageInput(value: JsonObject): GenerateImageInput {
  return {
    prompt: requiredString(value.prompt, "prompt"),
    save: normalizeSaveInput(value.save),
  }
}

function normalizeSaveInput(value: unknown): GenerateImageInput["save"] {
  if (value === undefined) {
    return {}
  }

  if (!isRecord(value)) {
    throw new Error("save must be an object.")
  }

  return {
    name: optionalString(value.name),
  }
}

function imageFileName(name: string | undefined, mimeType: string) {
  const extension = extensionForMimeType(mimeType)
  const fallback = `image-${new Date().toISOString().replace(/[:.]/g, "-")}`
  const baseName = sanitizeFileName(name ?? fallback)
  const stem = fileStem(baseName)

  return `${stem === "" ? fallback : stem}${extension}`
}

/** The name without its extension, so a caller-provided "hero.png" does not
 *  become "hero.png.png". */
function fileStem(name: string) {
  const dot = name.lastIndexOf(".")

  return dot <= 0 ? name : name.slice(0, dot)
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType.toLowerCase().split(";")[0]) {
    case "image/jpeg":
      return ".jpg"
    case "image/webp":
      return ".webp"
    case "image/png":
      return ".png"
    case "image/gif":
      return ".gif"
    default:
      return ".png"
  }
}

function sanitizeFileName(value: string) {
  const clean = value
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80)

  return clean === "" ? "image" : clean
}
