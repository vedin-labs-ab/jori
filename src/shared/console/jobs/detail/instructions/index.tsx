import { type JSONContent } from "@tiptap/core"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  createJobMentionCatalog,
  isJobSurfaceIntegration,
  type JobSurfaceFormValue,
} from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { createJobInstructionDocument } from "../../editor/instructions/document"
import { instructionMarkdownClassName } from "../../editor/instructions/editor/style"
import { type Job } from "../../types"
import { InstructionNodes } from "./nodes"

/** A job's brief, read the way its editor shows it: the markdown laid
 *  out, and every mention an inert pill. Built from the editor's own
 *  document, so what the page shows is what the editor would open on. */
export function JobInstructions({
  job,
  permissions,
  skills,
}: {
  job: Job
  permissions: JobPolicyPermissions
  /** Organization skill names, so `/` mentions resolve. */
  skills: readonly string[]
}) {
  const document = useMemo(
    () => instructionDocument(job, permissions, skills),
    [job, permissions, skills]
  )

  return (
    <div
      className={cn(
        "rounded-md bg-muted md:text-xs/relaxed",
        instructionMarkdownClassName
      )}
    >
      {/* The editor's styles address its content by TipTap's class; the
          same class puts this read-only copy under them. */}
      <div className="tiptap">
        <InstructionNodes
          nodes={document.content ?? []}
          permissions={permissions}
        />
      </div>
    </div>
  )
}

function instructionDocument(
  job: Job,
  permissions: JobPolicyPermissions,
  skills: readonly string[]
): JSONContent {
  return createJobInstructionDocument({
    catalog: createJobMentionCatalog({
      skills,
      tools: Array.isArray(permissions)
        ? permissions.map((permission) => permission.tool)
        : [],
    }),
    description: job.instructions,
    permissions,
    surfaces: job.access.surfaces.flatMap((surface): JobSurfaceFormValue[] =>
      isJobSurfaceIntegration(surface.integration)
        ? [{ integration: surface.integration, tools: surface.tools }]
        : []
    ),
  })
}
