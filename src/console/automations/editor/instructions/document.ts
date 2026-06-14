import { type JSONContent } from "@tiptap/core"
import { isAutomationSurfacePolicyBlocked } from "../../policy"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceProvider,
  getAutomationSurfaceLabel,
  getAutomationSurfaceMentionParts,
  isAutomationSurfaceProvider,
  syncAutomationSurfaces,
} from "../../surfaces"
import { type AutomationInstructionsFieldProps } from "./types"

export const automationSurfaceNodeName = "automationSurface"
export const automationSurfacePolicyStates = ["allowed", "blocked"] as const
export type AutomationSurfacePolicyState =
  (typeof automationSurfacePolicyStates)[number]

export type AutomationInstructionsValue = {
  description: string
  surfaces: AutomationSurfaceFormValue[]
}

export function createAutomationInstructionDocument({
  description,
  permissions,
  surfaces,
}: AutomationInstructionsValue & {
  permissions?: AutomationInstructionsFieldProps["permissions"]
}): JSONContent {
  const toolsByProvider = new Map(
    syncAutomationSurfaces(description, surfaces, permissions).map(
      (surface) => [surface.provider, surface.tools]
    )
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
        policy: readSurfacePolicy({
          permissions,
          provider: part.provider,
          tools: toolsByProvider.get(part.provider) ?? [],
        }),
        provider: part.provider,
        tools: toolsByProvider.get(part.provider) ?? [],
      },
    })
  }

  return {
    type: "doc",
    content: normalizeParagraphs(paragraphs),
  }
}

function readSurfacePolicy({
  permissions,
  provider,
  tools,
}: AutomationSurfaceFormValue & {
  permissions: AutomationInstructionsFieldProps["permissions"]
}): AutomationSurfacePolicyState {
  return isAutomationSurfacePolicyBlocked({
    permissions,
    surface: { provider, tools },
  })
    ? "blocked"
    : "allowed"
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

export function parseAutomationSurfaceProvider(provider: unknown) {
  return isAutomationSurfaceProvider(provider) ? provider : null
}

export function parseAutomationSurfacePolicy(
  policy: unknown
): AutomationSurfacePolicyState {
  return automationSurfacePolicyStates.some((state) => state === policy)
    ? (policy as AutomationSurfacePolicyState)
    : "allowed"
}

export function parseAutomationSurfaceTools(tools: unknown) {
  return Array.isArray(tools)
    ? tools.filter((tool): tool is string => typeof tool === "string")
    : []
}

export function parseAutomationSurfaceToolsAttribute(tools: unknown) {
  if (typeof tools === "string") {
    return tools.split(",").filter((tool) => tool !== "")
  }

  return parseAutomationSurfaceTools(tools)
}

export function readAutomationSurfaceToolsForProvider(
  document: JSONContent,
  provider: AutomationSurfaceProvider
): string[] | undefined {
  if (
    document.type === automationSurfaceNodeName &&
    document.attrs?.provider === provider
  ) {
    return parseAutomationSurfaceTools(document.attrs.tools)
  }

  for (const child of document.content ?? []) {
    const tools = readAutomationSurfaceToolsForProvider(child, provider)

    if (tools !== undefined) {
      return tools
    }
  }

  return undefined
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
      provider,
      tools: parseAutomationSurfaceTools(node.attrs?.tools),
    })
  }

  return getAutomationSurfaceLabel(provider)
}
