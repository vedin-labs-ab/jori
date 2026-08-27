import path from "node:path"
import { isRecord, type JsonObject } from "../../../contracts/json"
import { sandboxWorkspace } from "../../../contracts/runtime/sandbox"
import { optionalString, requiredString } from "../../input"
import { type AgentRuntime } from "../../runtime"
import { generateOpenRouterImage } from "./openrouter"

type GenerateImageInput = {
  prompt: string
  save: {
    description?: string
    name?: string
  }
}

const generatedImageDirectory = "generated-images"

export async function generateImageFile(
  runtime: AgentRuntime,
  input: JsonObject
) {
  const request = normalizeGenerateImageInput(input)
  const generated = await generateOpenRouterImage(request.prompt)
  const name = imageFileName(request.save.name, generated.mimeType)
  const workspacePath = `${generatedImageDirectory}/${name}`

  await runtime.sandbox.writeFiles([
    {
      content: generated.bytes,
      path: `${sandboxWorkspace}/${workspacePath}`,
    },
  ])

  const file = await runtime.platform.uploadFile({
    bytes: generated.bytes,
    description: request.save.description,
    mimeType: generated.mimeType,
    name,
    runId: runtime.context.run.id,
  })

  return {
    image: {
      ...file,
      model: generated.model,
      path: workspacePath,
    },
    provider: {
      name: "openrouter",
      requestId: generated.requestId,
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
    description: optionalString(value.description),
    name: optionalString(value.name),
  }
}

function imageFileName(name: string | undefined, mimeType: string) {
  const extension = extensionForMimeType(mimeType)
  const fallback = `image-${new Date().toISOString().replace(/[:.]/g, "-")}`
  const baseName = sanitizeFileName(name ?? fallback)
  const parsed = path.posix.parse(baseName)
  const stem = parsed.name === "" ? fallback : parsed.name

  return `${stem}${extension}`
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
