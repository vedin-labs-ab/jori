import { type JSONContent } from "@tiptap/core"
import {
  defaultScheduleSurfaceAccess,
  getScheduleSurfaceLabel,
  getScheduleSurfaceMentionParts,
  isScheduleSurfaceProvider,
  type ScheduleReadScope,
  type ScheduleSurfaceFormValue,
  type ScheduleSurfaceProvider,
  syncScheduleSurfaces,
} from "../surfaces"

export const scheduleSurfaceNodeName = "scheduleSurface"

export type ScheduleInstructionsValue = {
  description: string
  surfaces: ScheduleSurfaceFormValue[]
}

export function createScheduleInstructionDocument({
  description,
  readScope,
  surfaces,
}: ScheduleInstructionsValue & { readScope: ScheduleReadScope }): JSONContent {
  const accessByProvider = new Map(
    syncScheduleSurfaces(description, surfaces, readScope).map((surface) => [
      surface.provider,
      surface.access,
    ])
  )
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }]

  for (const part of getScheduleSurfaceMentionParts(description)) {
    if (part.provider === undefined) {
      appendText(paragraphs, part.text)
      continue
    }

    appendNode(paragraphs, {
      type: scheduleSurfaceNodeName,
      attrs: {
        access:
          accessByProvider.get(part.provider) ??
          defaultScheduleSurfaceAccess(readScope),
        provider: part.provider,
      },
    })
  }

  return {
    type: "doc",
    content: normalizeParagraphs(paragraphs),
  }
}

export function serializeScheduleInstructionDocument(
  document: JSONContent
): ScheduleInstructionsValue {
  const surfaces: ScheduleSurfaceFormValue[] = []
  const seen = new Set<ScheduleSurfaceProvider>()
  const description = (document.content ?? [])
    .map((node) => serializeBlock(node, surfaces, seen))
    .join("\n")

  return { description, surfaces }
}

export function scheduleInstructionKey(value: ScheduleInstructionsValue) {
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
  surfaces: ScheduleSurfaceFormValue[],
  seen: Set<ScheduleSurfaceProvider>
): string {
  if (node.type === "text") {
    return node.text ?? ""
  }

  if (node.type === "hardBreak") {
    return "\n"
  }

  if (node.type === scheduleSurfaceNodeName) {
    return serializeSurfaceNode(node, surfaces, seen)
  }

  return (node.content ?? [])
    .map((child) => serializeBlock(child, surfaces, seen))
    .join("")
}

function serializeSurfaceNode(
  node: JSONContent,
  surfaces: ScheduleSurfaceFormValue[],
  seen: Set<ScheduleSurfaceProvider>
) {
  const provider = node.attrs?.provider

  if (!isScheduleSurfaceProvider(provider)) {
    return ""
  }

  if (!seen.has(provider)) {
    seen.add(provider)
    surfaces.push({
      access: isScheduleSurfaceAccess(node.attrs?.access)
        ? node.attrs.access
        : "",
      provider,
    })
  }

  return getScheduleSurfaceLabel(provider)
}

function isScheduleSurfaceAccess(
  access: unknown
): access is ScheduleSurfaceFormValue["access"] {
  return (
    access === "" ||
    access === "read" ||
    access === "write" ||
    access === "both"
  )
}
