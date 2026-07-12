import { type Node as ProseMirrorNode } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import { type AutomationSurfaceFormValue } from "../../../access"
import {
  automationSurfaceNodeName,
  parseAutomationSurfaceIntegration,
  parseAutomationSurfaceTools,
} from "../document"

const surfaceCache = new WeakMap<
  ProseMirrorNode,
  readonly AutomationSurfaceFormValue[]
>()

export function readEditorInstructionSurfaces(editor: Editor) {
  return readCachedInstructionSurfaces(editor.state.doc)
}

export function readCachedInstructionSurfaces(document: ProseMirrorNode) {
  const cached = surfaceCache.get(document)

  if (cached !== undefined) {
    return cached
  }

  const surfaces: AutomationSurfaceFormValue[] = []
  const seen = new Set<AutomationSurfaceFormValue["integration"]>()

  document.descendants((node) => {
    const integration = parseAutomationSurfaceIntegration(
      node.attrs.integration
    )

    if (
      node.type.name === automationSurfaceNodeName &&
      integration !== null &&
      !seen.has(integration)
    ) {
      seen.add(integration)
      surfaces.push({
        integration,
        tools: parseAutomationSurfaceTools(node.attrs.tools),
      })
    }
  })
  surfaceCache.set(document, surfaces)

  return surfaces
}
