import { createJobMentionCatalog } from "@/shared/console/jobs/access"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import { jobToolReferenceIssue } from "@/shared/console/jobs/access/tools"
import {
  createJobInstructionDocument,
  serializeJobInstructionDocument,
} from "@/shared/console/jobs/editor/instructions/document"
import { readInstructionReferences } from "@/shared/console/jobs/editor/instructions/markdown/references"
import { type JobFormValues } from "@/shared/console/jobs/types"

export function prepareJobInstructions(
  values: Pick<JobFormValues, "instructions" | "scope" | "surfaces">,
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
          })
        : undefined,
  }
}
