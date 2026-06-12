import { type JSONContent } from "@tiptap/core"
import {
  type AutomationReadScope,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceProvider,
  defaultAutomationSurfaceAccess,
  getAutomationSurfaceLabel,
  getAutomationSurfaceMentionParts,
  isAutomationSurfaceProvider,
  syncAutomationSurfaces,
} from "../../surfaces"

export const automationSurfaceNodeName = "automationSurface"

export type AutomationInstructionsValue = {
  description: string
  surfaces: AutomationSurfaceFormValue[]
}

export function createAutomationInstructionDocument({
  description,
  readScope,
  surfaces,
}: AutomationInstructionsValue & {
  readScope: AutomationReadScope
}): JSONContent {
  const accessByProvider = new Map(
    syncAutomationSurfaces(description, surfaces, readScope).map((surface) => [
      surface.provider,
      surface.access,
    ])
  )
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }]

  for (const part of getAutomationSurfaceMentionParts(description)) {
    if (part.provider === undefined) {
      appendText(paragraphs, part.text)
      continue
    }

    appendNode(paragraphs, {
      type: automationSurfaceNodeName,
      attrs: {
        access:
          accessByProvider.get(part.provider) ??
          defaultAutomationSurfaceAccess(readScope),
        provider: part.provider,
      },
    })
  }

  return {
    type: "doc",
    content: normalizeParagraphs(paragraphs),
  }
}

export function serializeAutomationInstructionDocument(
  document: JSONContent
): AutomationInstructionsValue {
  const surfaces: AutomationSurfaceFormValue[] = []
  const seen = new Set<AutomationSurfaceProvider>()
  const description = (document.content ?? [])
    .map((node) => serializeBlock(node, surfaces, seen))
    .join("\n")

  return { description, surfaces }
}

export function automationInstructionKey(value: AutomationInstructionsValue) {
  return JSON.stringify({
    description: value.description,
    surfaces: value.surfaces,
  })
}

function appendText(paragraphs: JSONContent[], text: string) {
  const lines = text.split("\n")

  for (let index = 0; index < lines.length; index += 1) {
    if (index > 0) {
      paragraphs.push({ type: "paragraph", content: [] })
    }

    if (lines[index] !== "") {
      appendNode(paragraphs, { type: "text", text: lines[index] })
    }
  }
}

function appendNode(paragraphs: JSONContent[], node: JSONContent) {
  const paragraph = paragraphs.at(-1)

  if (paragraph === undefined) {
    paragraphs.push({ type: "paragraph", content: [node] })
    return
  }

  paragraph.content = [...(paragraph.content ?? []), node]
}

function normalizeParagraphs(paragraphs: JSONContent[]) {
  return paragraphs.map((paragraph) =>
    paragraph.content?.length === 0 ? { type: "paragraph" } : paragraph
  )
}

function serializeBlock(
  node: JSONContent,
  surfaces: AutomationSurfaceFormValue[],
  seen: Set<AutomationSurfaceProvider>
): string {
  if (node.type === "text") {
    return node.text ?? ""
  }

  if (node.type === "hardBreak") {
    return "\n"
  }

  if (node.type === automationSurfaceNodeName) {
    return serializeSurfaceNode(node, surfaces, seen)
  }

  return (node.content ?? [])
    .map((child) => serializeBlock(child, surfaces, seen))
    .join("")
}

function serializeSurfaceNode(
  node: JSONContent,
  surfaces: AutomationSurfaceFormValue[],
  seen: Set<AutomationSurfaceProvider>
) {
  const provider = node.attrs?.provider

  if (!isAutomationSurfaceProvider(provider)) {
    return ""
  }

  if (!seen.has(provider)) {
    seen.add(provider)
    surfaces.push({
      access: isAutomationSurfaceAccess(node.attrs?.access)
        ? node.attrs.access
        : "",
      provider,
    })
  }

  return getAutomationSurfaceLabel(provider)
}

function isAutomationSurfaceAccess(
  access: unknown
): access is AutomationSurfaceFormValue["access"] {
  return (
    access === "" ||
    access === "read" ||
    access === "write" ||
    access === "both"
  )
}
