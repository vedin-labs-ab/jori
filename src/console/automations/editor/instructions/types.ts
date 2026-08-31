import { type Editor } from "@tiptap/react"
import { type MutableRefObject } from "react"
import {
  type AutomationMentionCatalog,
  type AutomationMentionSources,
  type AutomationScope,
  type AutomationSurfaceFormValue,
} from "../../access"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type AutomationInstructionsValue } from "./document"
import { type InstructionSuggestionState } from "./suggestion/suggest"

export type AutomationInstructionsFieldProps = {
  additionalSurfaces: AutomationSurfaceFormValue[]
  error?: string
  id: string
  onWebSearchChange: (enabled: boolean) => void
  onValueChange: (value: AutomationInstructionsValue) => void
  placeholder: string
  permissions?: AutomationPolicyPermissions
  policyKey: string
  showAccessError?: boolean
  scope: AutomationScope
  /** Organization skill names, for `/` mentions; empty while loading. */
  skills: readonly string[]
  surfaces: AutomationSurfaceFormValue[]
  organizationId: string
  value: string
  webSearch: boolean
}

export type InstructionRefs = {
  additionalSurfaces: MutableRefObject<AutomationSurfaceFormValue[]>
  catalog: MutableRefObject<AutomationMentionCatalog>
  editor: MutableRefObject<Editor | null>
  emittedValueKey: MutableRefObject<string | undefined>
  onWebSearchChange: MutableRefObject<
    AutomationInstructionsFieldProps["onWebSearchChange"]
  >
  onValueChange: MutableRefObject<
    AutomationInstructionsFieldProps["onValueChange"]
  >
  permissions: MutableRefObject<AutomationPolicyPermissions>
  scope: MutableRefObject<AutomationInstructionsFieldProps["scope"]>
  sources: MutableRefObject<AutomationMentionSources>
  suggestion: MutableRefObject<InstructionSuggestionState | null>
  organizationId: MutableRefObject<string>
}
