import { createAutomationMentionCatalog } from "../../access"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { automationToolReferenceIssue } from "../../access/tools"
import { type AutomationFormValues } from "../../types"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "../instructions/document"
import { readInstructionReferences } from "../instructions/markdown/references"

export function prepareAutomationInstructions(
  values: Pick<
    AutomationFormValues,
    "instructions" | "scope" | "surfaces" | "webSearch"
  >,
  permissions: AutomationPolicyPermissions
) {
  const catalog = createAutomationMentionCatalog({
    tools: Array.isArray(permissions)
      ? permissions.map((permission) => permission.tool)
      : [],
  })
  const document = createAutomationInstructionDocument({
    catalog,
    description: values.instructions.trim(),
    permissions,
    surfaces: values.surfaces,
  })
  const instructions =
    serializeAutomationInstructionDocument(document).description.trim()
  const issue = readInstructionReferences(document).find(
    (reference) =>
      reference.kind === "tool" &&
      automationToolReferenceIssue({
        permissions,
        scope: values.scope,
        surfaces: values.surfaces,
        tool: reference.id,
        webSearch: values.webSearch,
      }) !== undefined
  )

  return {
    instructions,
    issue:
      issue?.kind === "tool"
        ? automationToolReferenceIssue({
            permissions,
            scope: values.scope,
            surfaces: values.surfaces,
            tool: issue.id,
            webSearch: values.webSearch,
          })
        : undefined,
  }
}

export function isAutomationToolReferenceError(error: string | undefined) {
  return (
    error?.startsWith("Give @") === true ||
    error?.startsWith("Enable web access to use #") === true ||
    error?.endsWith("requires Personal sharing.") === true ||
    (error?.startsWith("#") === true &&
      error.endsWith("is not available in automations."))
  )
}
