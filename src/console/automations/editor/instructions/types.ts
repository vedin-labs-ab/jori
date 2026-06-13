import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import { type AutomationPolicyPermissions } from "../../policy"
import { type AutomationSurfaceFormValue } from "../../surfaces"
import { type AutomationInstructionsValue } from "./document"
import { type InstructionSuggestionState } from "./suggest"

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
