import { Markdown } from "@tiptap/markdown"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { AutomationSurfaceNodeView } from "../access/node"
import {
  createInstructionMarkdownExtensions,
  instructionMarkdownOptions,
} from "../markdown/extensions"
import { createInstructionMarked } from "../markdown/literal"
import {
  AutomationSurfaceNode,
  type AutomationSurfaceNodeOptions,
} from "../markdown/schema"
import { type InstructionRefs } from "../types"
import { AutomationReferenceExtension } from "./reference"

export type AutomationSurfaceExtensionOptions = AutomationSurfaceNodeOptions & {
  getPermissions: () => AutomationPolicyPermissions
}

export function createInstructionExtensions(refs: InstructionRefs) {
  return [
    ...createInstructionMarkdownExtensions(),
    AutomationReferenceExtension.configure({
      getPermissions: () => refs.permissions.current,
      getScope: () => refs.scope.current,
      getWebSearch: () => refs.sources.current.webSearch ?? false,
    }),
    AutomationSurfaceExtension.configure({
      getPermissions: () => refs.permissions.current,
      getScope: () => refs.scope.current,
    }),
    Markdown.configure({
      marked: createInstructionMarked(),
      markedOptions: instructionMarkdownOptions,
    }),
  ]
}

const AutomationSurfaceExtension = AutomationSurfaceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AutomationSurfaceNodeView)
  },
})
