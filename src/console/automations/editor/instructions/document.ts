import { type JSONContent } from "@tiptap/core"
import {
  type AutomationMentionCatalog,
  type AutomationMentionKind,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  automationMentionText,
  isAutomationSurfaceIntegration,
  readAutomationMentions,
  syncAutomationSurfaces,
} from "../../access"
import { isAutomationSurfacePolicyBlocked } from "../../access/policy"
import { type AutomationInstructionsFieldProps } from "./types"

export const automationSurfaceNodeName = "automationSurface"
export const automationReferenceNodeName = "automationReference"
const automationSurfacePolicyStates = ["allowed", "blocked"] as const
export type AutomationSurfacePolicyState =
  (typeof automationSurfacePolicyStates)[number]

export type AutomationInstructionsValue = {
  description: string
  surfaces: AutomationSurfaceFormValue[]
}

export function createAutomationInstructionDocument({
  catalog,
  description,
  permissions,
  surfaces,
}: AutomationInstructionsValue & {
  catalog: AutomationMentionCatalog
  permissions?: AutomationInstructionsFieldProps["permissions"]
}): JSONContent {
  const toolsByProvider = new Map(
    syncAutomationSurfaces(description, surfaces, permissions, catalog).map(
      (surface) => [surface.integration, surface.tools]
    )
  )
  const paragraphs: JSONContent[] = [{ type: "paragraph", content: [] }]
  let cursor = 0

  for (const mention of readAutomationMentions(description, catalog)) {
    appendText(paragraphs, description.slice(cursor, mention.start))
    appendNode(
      paragraphs,
      mention.kind === "integration"
        ? surfaceNode(
            mention.id as AutomationSurfaceIntegration,
            toolsByProvider,
            permissions
          )
        : {
            type: automationReferenceNodeName,
            attrs: { id: mention.id, kind: mention.kind },
          }
    )
    cursor = mention.end
  }

  appendText(paragraphs, description.slice(cursor))

  return {
    type: "doc",
    content: normalizeParagraphs(paragraphs),
  }
}

function surfaceNode(
  integration: AutomationSurfaceIntegration,
  toolsByProvider: Map<AutomationSurfaceIntegration, string[]>,
  permissions: AutomationInstructionsFieldProps["permissions"]
): JSONContent {
  const tools = toolsByProvider.get(integration) ?? []

  return {
    type: automationSurfaceNodeName,
    attrs: {
      policy: isAutomationSurfacePolicyBlocked({
        permissions,
        surface: { integration, tools },
      })
        ? "blocked"
        : "allowed",
      integration,
      tools,
    },
  }
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

export function parseAutomationReferenceKind(
  kind: unknown
): Exclude<AutomationMentionKind, "integration"> | null {
  return kind === "skill" || kind === "tool" ? kind : null
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

  if (node.type === automationReferenceNodeName) {
    return serializeReferenceNode(node)
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

  return automationMentionText("integration", integration)
}

function serializeReferenceNode(node: JSONContent) {
  const kind = parseAutomationReferenceKind(node.attrs?.kind)
  const id = node.attrs?.id

  return kind === null || typeof id !== "string" || id === ""
    ? ""
    : automationMentionText(kind, id)
}
