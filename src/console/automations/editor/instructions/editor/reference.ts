import { ReactNodeViewRenderer } from "@tiptap/react"
import { AutomationReferenceNodeView } from "../access/reference"
import { AutomationReferenceNode } from "../markdown/schema"

export const AutomationReferenceExtension = AutomationReferenceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AutomationReferenceNodeView)
  },
})
