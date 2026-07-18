import { type Scope } from "@contracts/permissions/scope"
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
  additionalSurfaces: AutomationSurfaceFormValue[]
  error?: string
  id: string
  onBlur: () => void
  onWebSearchChange: (enabled: boolean) => void
  onValueChange: (value: AutomationInstructionsValue) => void
  placeholder: string
  permissions?: AutomationPolicyPermissions
  policyKey: string
  showAccessError?: boolean
  scope: Scope
  /** Tenant skill names, for `/` mentions; empty while loading. */
  skills: readonly string[]
  surfaces: AutomationSurfaceFormValue[]
  tenantId: string
  value: string
  webSearch: boolean
}

export type InstructionRefs = {
  additionalSurfaces: MutableRefObject<AutomationSurfaceFormValue[]>
  catalog: MutableRefObject<AutomationMentionCatalog>
  editor: MutableRefObject<Editor | null>
  emittedValueKey: MutableRefObject<string | undefined>
  onBlur: MutableRefObject<AutomationInstructionsFieldProps["onBlur"]>
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
  tenantId: MutableRefObject<string>
}
