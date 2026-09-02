import { Markdown } from "@tiptap/markdown"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { JobSurfaceNodeView } from "../access/node"
import { JobReferenceNodeView } from "../access/reference"
import {
  createInstructionMarkdownExtensions,
  instructionMarkdownOptions,
} from "../markdown/extensions"
import { createInstructionMarked } from "../markdown/literal"
import { JobReferenceNode, JobSurfaceNode } from "../markdown/schema"
import { type InstructionRefs } from "../types"

export function createInstructionExtensions(refs: InstructionRefs) {
  return [
    ...createInstructionMarkdownExtensions(),
    JobReferenceExtension.configure({
      getPermissions: () => refs.permissions.current,
      getScope: () => refs.scope.current,
      getOrganizationId: () => refs.organizationId.current,
      getWebSearch: () => refs.sources.current.webSearch ?? false,
    }),
    JobSurfaceExtension.configure({
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

const JobReferenceExtension = JobReferenceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(JobReferenceNodeView)
  },
})

const JobSurfaceExtension = JobSurfaceNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(JobSurfaceNodeView)
  },
})
