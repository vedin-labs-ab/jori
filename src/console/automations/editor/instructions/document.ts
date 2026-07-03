import { type JSONContent } from "@tiptap/core"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
  getAutomationSurfaceMentionParts,
  isAutomationSurfaceIntegration,
  syncAutomationSurfaces,
} from "../../access"
import { isAutomationSurfacePolicyBlocked } from "../../access/policy"
import { type AutomationInstructionsFieldProps } from "./types"

export const automationSurfaceNodeName = "automationSurface"
const automationSurfacePolicyStates = ["allowed", "blocked"] as const
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
      (surface) => [surface.integration, surface.tools]
    )
  )
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }]

  for (const part of getAutomationSurfaceMentionParts(description)) {
    if (part.integration === undefined) {
      appendText(paragraphs, part.text)
      continue
    }

    appendNode(paragraphs, {
      type: automationSurfaceNodeName,
      attrs: {
        policy: readSurfacePolicy({
          permissions,
          integration: part.integration,
          tools: toolsByProvider.get(part.integration) ?? [],
        }),
        integration: part.integration,
        tools: toolsByProvider.get(part.integration) ?? [],
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
  integration,
  tools,
}: AutomationSurfaceFormValue & {
  permissions: AutomationInstructionsFieldProps["permissions"]
}): AutomationSurfacePolicyState {
  return isAutomationSurfacePolicyBlocked({
    permissions,
    surface: { integration, tools },
  })
    ? "blocked"
    : "allowed"
}

export function serializeAutomationInstructionDocument(
  document: JSONContent
): AutomationInstructionsValue {
  const surfaces: AutomationSurfaceFormValue[] = []
  const seen = new Set<AutomationSurfaceIntegration>()
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

export function parseAutomationSurfaceIntegration(integration: unknown) {
  return isAutomationSurfaceIntegration(integration) ? integration : null
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

export function readAutomationSurfaceToolsForIntegration(
  document: JSONContent,
  integration: AutomationSurfaceIntegration
): string[] | undefined {
  if (
    document.type === automationSurfaceNodeName &&
    document.attrs?.integration === integration
  ) {
    return parseAutomationSurfaceTools(document.attrs.tools)
  }

  for (const child of document.content ?? []) {
    const tools = readAutomationSurfaceToolsForIntegration(child, integration)

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
  seen: Set<AutomationSurfaceIntegration>
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
  seen: Set<AutomationSurfaceIntegration>
) {
  const integration = node.attrs?.integration

  if (!isAutomationSurfaceIntegration(integration)) {
    return ""
  }

  if (!seen.has(integration)) {
    seen.add(integration)
    surfaces.push({
      integration,
      tools: parseAutomationSurfaceTools(node.attrs?.tools),
    })
  }

  return getAutomationSurfaceLabel(integration)
}
