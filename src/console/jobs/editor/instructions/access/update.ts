import { type Transaction } from "@tiptap/pm/state"
import { type Editor } from "@tiptap/react"
import { type JobSurfaceIntegration } from "@/shared/console/jobs/access"
import { jobSurfaceNodeName, parseJobSurfaceTools } from "../document"

export function addIntegrationTool(
  transaction: Transaction,
  integration: JobSurfaceIntegration,
  tool: string
) {
  let changed = false
  let found = false

  transaction.doc.descendants((node, position) => {
    if (
      node.type.name !== jobSurfaceNodeName ||
      node.attrs.integration !== integration
    ) {
      return
    }

    found = true
    const tools = parseJobSurfaceTools(node.attrs.tools)

    if (!tools.includes(tool)) {
      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        tools: [...tools, tool],
      })
      changed = true
    }
  })

  return { changed, found }
}

export function setIntegrationTools({
  editor,
  integration,
  tools,
}: {
  editor: Editor
  integration: JobSurfaceIntegration
  tools: string[]
}) {
  const transaction = editor.state.tr
  let changed = false

  editor.state.doc.descendants((node, position) => {
    if (
      node.type.name !== jobSurfaceNodeName ||
      node.attrs.integration !== integration ||
      haveSameTools(parseJobSurfaceTools(node.attrs.tools), tools)
    ) {
      return
    }

    transaction.setNodeMarkup(position, undefined, { ...node.attrs, tools })
    changed = true
  })

  if (changed) {
    editor.view.dispatch(transaction.scrollIntoView())
  }
}

function haveSameTools(left: string[], right: string[]) {
  const leftTools = new Set(left)
  const rightTools = new Set(right)

  return (
    leftTools.size === rightTools.size &&
    [...leftTools].every((tool) => rightTools.has(tool))
  )
}
