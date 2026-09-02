import { type Node as ProseMirrorNode } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import { type JobSurfaceFormValue } from "../../../access"
import {
  jobSurfaceNodeName,
  parseJobSurfaceIntegration,
  parseJobSurfaceTools,
} from "../document"

const surfaceCache = new WeakMap<
  ProseMirrorNode,
  readonly JobSurfaceFormValue[]
>()

export function readEditorInstructionSurfaces(editor: Editor) {
  return readCachedInstructionSurfaces(editor.state.doc)
}

export function readCachedInstructionSurfaces(document: ProseMirrorNode) {
  const cached = surfaceCache.get(document)

  if (cached !== undefined) {
    return cached
  }

  const surfaces: JobSurfaceFormValue[] = []
  const seen = new Set<JobSurfaceFormValue["integration"]>()

  document.descendants((node) => {
    const integration = parseJobSurfaceIntegration(node.attrs.integration)

    if (
      node.type.name === jobSurfaceNodeName &&
      integration !== null &&
      !seen.has(integration)
    ) {
      seen.add(integration)
      surfaces.push({
        integration,
        tools: parseJobSurfaceTools(node.attrs.tools),
      })
    }
  })
  surfaceCache.set(document, surfaces)

  return surfaces
}
