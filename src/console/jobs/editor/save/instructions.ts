import { createJobMentionCatalog } from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { jobToolReferenceIssue } from "../../access/tools"
import { type JobFormValues } from "../../types"
import {
  createJobInstructionDocument,
  serializeJobInstructionDocument,
} from "../instructions/document"
import { readInstructionReferences } from "../instructions/markdown/references"

export function prepareJobInstructions(
  values: Pick<
    JobFormValues,
    "instructions" | "scope" | "surfaces" | "webSearch"
  >,
  permissions: JobPolicyPermissions
) {
  const catalog = createJobMentionCatalog({
    tools: Array.isArray(permissions)
      ? permissions.map((permission) => permission.tool)
      : [],
  })
  const document = createJobInstructionDocument({
    catalog,
    description: values.instructions.trim(),
    permissions,
    surfaces: values.surfaces,
  })
  const instructions =
    serializeJobInstructionDocument(document).description.trim()
  const issue = readInstructionReferences(document).find(
    (reference) =>
      reference.kind === "tool" &&
      jobToolReferenceIssue({
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
        ? jobToolReferenceIssue({
            permissions,
            scope: values.scope,
            surfaces: values.surfaces,
            tool: issue.id,
            webSearch: values.webSearch,
          })
        : undefined,
  }
}
