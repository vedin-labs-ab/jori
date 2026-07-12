import { type JSONContent } from "@tiptap/core"
import {
  type AutomationMentionCatalog,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
} from "../../access"
import {
  parseInstructionMarkdown,
  serializeInstructionMarkdown,
} from "./markdown/codec"
import {
  hydrateInstructionReferences,
  readInstructionSurfaces,
} from "./markdown/references"
import {
  automationSurfaceNodeName,
  parseAutomationSurfaceTools,
} from "./markdown/schema"
import { type AutomationInstructionsFieldProps } from "./types"

export {
  type AutomationSurfacePolicyState,
  automationReferenceNodeName,
  automationSurfaceNodeName,
  fencedTextNodeName,
  parseAutomationReferenceKind,
  parseAutomationSurfaceIntegration,
  parseAutomationSurfacePolicy,
  parseAutomationSurfaceTools,
  parseAutomationSurfaceToolsAttribute,
} from "./markdown/schema"

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
  return hydrateInstructionReferences({
    catalog,
    document: parseInstructionMarkdown(description),
    permissions,
    surfaces,
  })
}

export function serializeAutomationInstructionDocument(
  document: JSONContent
): AutomationInstructionsValue {
  return {
    description: serializeInstructionMarkdown(document),
    surfaces: readInstructionSurfaces(document),
  }
}

export function automationInstructionKey(value: AutomationInstructionsValue) {
  return JSON.stringify({
    description: value.description,
    surfaces: value.surfaces,
  })
}

export function readAdditionalAutomationSurfaces({
  catalog,
  description,
  permissions,
  surfaces,
}: AutomationInstructionsValue & {
  catalog: AutomationMentionCatalog
  permissions?: AutomationInstructionsFieldProps["permissions"]
}) {
  if (surfaces.length === 0) {
    return []
  }

  const document = createAutomationInstructionDocument({
    catalog,
    description,
    permissions,
    surfaces,
  })
  const mentioned = new Set(
    readInstructionSurfaces(document).map((surface) => surface.integration)
  )

  return surfaces.filter((surface) => !mentioned.has(surface.integration))
}

export function mergeAutomationSurfaces(
  mentioned: AutomationSurfaceFormValue[],
  additional: AutomationSurfaceFormValue[]
) {
  const integrations = new Set(mentioned.map((surface) => surface.integration))

  return [
    ...mentioned,
    ...additional.filter((surface) => !integrations.has(surface.integration)),
  ]
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
