import { Markdown } from "@tiptap/markdown"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { AutomationSurfaceNodeView } from "../access/node"
import { AutomationReferenceNodeView } from "../access/reference"
import {
  createInstructionMarkdownExtensions,
  instructionMarkdownOptions,
} from "../markdown/extensions"
import { createInstructionMarked } from "../markdown/literal"
import {
  AutomationReferenceNode,
  AutomationSurfaceNode,
} from "../markdown/schema"
import { type InstructionRefs } from "../types"

export function createInstructionExtensions(refs: InstructionRefs) {
  return [
    ...createInstructionMarkdownExtensions(),
    AutomationReferenceExtension.configure({
      getPermissions: () => refs.permissions.current,
      getScope: () => refs.scope.current,
      getOrganizationId: () => refs.organizationId.current,
      getWebSearch: () => refs.sources.current.webSearch ?? false,
    }),
    AutomationSurfaceExtension.configure({
      getPermissions: () => refs.permissions.current,
      getScope: () => refs.scope.current,
      getOrganizationId: () => refs.organizationId.current,
    }),
    Markdown.configure({
      marked: createInstructionMarked(),
      markedOptions: instructionMarkdownOptions,
    }),
  ]
}

const AutomationReferenceExtension = AutomationReferenceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AutomationReferenceNodeView)
  },
})

const AutomationSurfaceExtension = AutomationSurfaceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AutomationSurfaceNodeView)
  },
})
