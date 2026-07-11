import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import {
  type AutomationMentionCatalog,
  type AutomationMentionSources,
  type AutomationSurfaceFormValue,
} from "../../access"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type AutomationInstructionsValue } from "./document"
import { type InstructionSuggestionState } from "./suggestion/suggest"

export type AutomationInstructionsFieldProps = {
  error?: string
  id: string
  onBlur: () => void
  onValueChange: (value: AutomationInstructionsValue) => void
  placeholder: string
  permissions?: AutomationPolicyPermissions
  policyKey: string
  showAccessError?: boolean
  /** Tenant skill names, for `/` mentions; empty while loading. */
  skills: readonly string[]
  surfaces: AutomationSurfaceFormValue[]
  value: string
}

export type InstructionRefs = {
  catalog: MutableRefObject<AutomationMentionCatalog>
  editor: MutableRefObject<Editor | null>
  onBlur: MutableRefObject<AutomationInstructionsFieldProps["onBlur"]>
  onValueChange: MutableRefObject<
    AutomationInstructionsFieldProps["onValueChange"]
  >
  permissions: MutableRefObject<AutomationPolicyPermissions>
  sources: MutableRefObject<AutomationMentionSources>
  suggestion: MutableRefObject<InstructionSuggestionState | null>
}
