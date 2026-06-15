import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import { type AutomationSurfaceFormValue } from "../../access"
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
  surfaces: AutomationSurfaceFormValue[]
  value: string
}

export type InstructionRefs = {
  editor: MutableRefObject<Editor | null>
  onBlur: MutableRefObject<AutomationInstructionsFieldProps["onBlur"]>
  onValueChange: MutableRefObject<
    AutomationInstructionsFieldProps["onValueChange"]
  >
  permissions: MutableRefObject<AutomationPolicyPermissions>
  suggestion: MutableRefObject<InstructionSuggestionState | null>
}
