import { canUseJobTool, getToolPermission } from "@contracts/permissions"
import { assessToolRisk, type ToolRisk } from "@contracts/permissions/risk"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getJobSurfaceLabel } from "../../access/catalog"
import { type JobPolicyPermissions } from "../../access/policy"
import { type JobFormValues } from "../../types"

const labels: Record<ToolRisk, string> = {
  private: "Private data",
  untrusted: "Content from others",
  outbound: "Sending data out",
}

export function JobToolRisk({
  surfaces,
  permissions,
}: {
  surfaces: JobFormValues["surfaces"]
  permissions: JobPolicyPermissions
}) {
  const tools = surfaces.flatMap((surface) => surface.tools)
  const assessment = assessToolRisk(
    Array.isArray(permissions)
      ? tools.filter((tool) =>
          permissions.some(
            (permission) =>
              permission.tool === tool && canUseJobTool(permission)
          )
        )
      : tools
  )

  if (!assessment.warning) {
    return null
  }

  return (
    <Alert role="status">
      <TriangleAlert aria-hidden="true" className="text-warning" />
      <AlertTitle>This job could expose private data</AlertTitle>
      <AlertDescription>
        Content it reads could steer it into sending private data out. Remove
        one kind of access below, or split the work into separate jobs.
        <details className="mt-1.5">
          <summary className="cursor-pointer text-foreground">
            Tools in this combination
          </summary>
          <dl className="mt-1.5 grid gap-1.5">
            {(Object.keys(labels) as ToolRisk[]).map((risk) => (
              <div key={risk}>
                <dt className="font-medium text-foreground">{labels[risk]}</dt>
                <dd>{assessment.groups[risk].map(toolLabel).join(", ")}</dd>
              </div>
            ))}
          </dl>
        </details>
      </AlertDescription>
    </Alert>
  )
}

function toolLabel(tool: string) {
  const permission = getToolPermission(tool)
  return permission === undefined
    ? tool
    : `${getJobSurfaceLabel(permission.surface)}: ${permission.label}`
}
