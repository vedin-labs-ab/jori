import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import {
  type JobMentionCatalog,
  type JobMentionSources,
  type JobScope,
  type JobSurfaceFormValue,
} from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { type JobInstructionsValue } from "./document"
import { type InstructionSuggestionState } from "./suggestion/suggest"

export type JobInstructionsFieldProps = {
  additionalSurfaces: JobSurfaceFormValue[]
  error?: string
  id: string
  onValueChange: (value: JobInstructionsValue) => void
  placeholder: string
  permissions?: JobPolicyPermissions
  policyKey: string
  showAccessError?: boolean
  scope: JobScope
  /** Organization skill names, for `/` mentions; empty while loading. */
  skills: readonly string[]
  surfaces: JobSurfaceFormValue[]
  value: string
}

export type InstructionRefs = {
  additionalSurfaces: MutableRefObject<JobSurfaceFormValue[]>
  catalog: MutableRefObject<JobMentionCatalog>
  editor: MutableRefObject<Editor | null>
  emittedValueKey: MutableRefObject<string | undefined>
  onValueChange: MutableRefObject<JobInstructionsFieldProps["onValueChange"]>
  permissions: MutableRefObject<JobPolicyPermissions>
  scope: MutableRefObject<JobInstructionsFieldProps["scope"]>
  sources: MutableRefObject<JobMentionSources>
  suggestion: MutableRefObject<InstructionSuggestionState | null>
}
