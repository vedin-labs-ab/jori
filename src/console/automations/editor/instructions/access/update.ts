import { type Transaction } from "@tiptap/pm/state"
import { type Editor } from "@tiptap/react"
import { type AutomationSurfaceIntegration } from "../../../access"
import {
  automationSurfaceNodeName,
  parseAutomationSurfaceTools,
} from "../document"

export function addIntegrationTool(
  transaction: Transaction,
  integration: AutomationSurfaceIntegration,
  tool: string
) {
  let changed = false
  let found = false

  transaction.doc.descendants((node, position) => {
    if (
      node.type.name !== automationSurfaceNodeName ||
      node.attrs.integration !== integration
    ) {
      return
    }

    found = true
    const tools = parseAutomationSurfaceTools(node.attrs.tools)

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
  integration: AutomationSurfaceIntegration
  tools: string[]
}) {
  const transaction = editor.state.tr
  let changed = false

  editor.state.doc.descendants((node, position) => {
    if (
      node.type.name !== automationSurfaceNodeName ||
      node.attrs.integration !== integration ||
      haveSameTools(parseAutomationSurfaceTools(node.attrs.tools), tools)
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
