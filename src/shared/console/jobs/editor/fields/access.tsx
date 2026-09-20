import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ProviderLogo } from "@/shared/logo/provider"
import {
  getJobSurfaceLabel,
  getJobSurfaceScopeIssue,
  type JobScope,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
} from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { JobSurfaceToolsDialog } from "../instructions/access/tools"

/** Everything a job can use, in one place to scan: what its instructions
 *  name with an `@` and what was added here. Either kind opens its tools;
 *  only what was added here is removed here, since a named one goes with
 *  its mention. */
export function AccessFields({
  available,
  named,
  onSurfaceAdd,
  onSurfaceChange,
  onSurfaceRemove,
  permissions,
  scope,
  surfaces,
}: {
  /** The integrations the job holds no access to yet. */
  available: readonly JobSurfaceIntegration[]
  /** The integrations the instructions name. */
  named: ReadonlySet<JobSurfaceIntegration>
  onSurfaceAdd: (integration: JobSurfaceIntegration) => void
  onSurfaceChange: (surface: JobSurfaceFormValue) => void
  onSurfaceRemove: (integration: JobSurfaceIntegration) => void
  permissions: JobPolicyPermissions
  scope: JobScope
  surfaces: JobSurfaceFormValue[]
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-1">
          <Label>Access</Label>
          <p className="text-muted-foreground text-xs">
            What this job can use. Type @ in the instructions, or add it here.
          </p>
        </div>
        <AddAccess available={available} onAdd={onSurfaceAdd} />
      </div>
      {surfaces.length === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {surfaces.map((surface) => (
            <AccessSurface
              key={surface.integration}
              onChange={onSurfaceChange}
              onRemove={
                named.has(surface.integration) ? undefined : onSurfaceRemove
              }
              permissions={permissions}
              scope={scope}
              surface={surface}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddAccess({
  available,
  onAdd,
}: {
  available: readonly JobSurfaceIntegration[]
  onAdd: (integration: JobSurfaceIntegration) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Add access"
          disabled={available.length === 0}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {available.map((integration) => (
          <DropdownMenuItem
            key={integration}
            onSelect={() => onAdd(integration)}
          >
            <ProviderLogo surface={integration} />
            {getJobSurfaceLabel(integration)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccessSurface({
  onChange,
  onRemove,
  permissions,
  scope,
  surface,
}: {
  onChange: (surface: JobSurfaceFormValue) => void
  /** Left out for access the instructions name, which goes with its mention. */
  onRemove?: (integration: JobSurfaceIntegration) => void
  permissions: JobPolicyPermissions
  scope: JobScope
  surface: JobSurfaceFormValue
}) {
  const [open, setOpen] = useState(false)
  const label = getJobSurfaceLabel(surface.integration)
  const toolCount = `${surface.tools.length} tool${
    surface.tools.length === 1 ? "" : "s"
  }`
  const issue = getJobSurfaceScopeIssue(scope, surface.integration)
  const invalid =
    issue !== undefined &&
    "border-destructive/60 bg-destructive/5 text-destructive"

  return (
    <div
      className={cn(
        "inline-flex rounded-md",
        issue !== undefined && "ring-2 ring-destructive/20"
      )}
      title={
        issue ??
        (onRemove === undefined
          ? "Named in the instructions. Remove it there."
          : undefined)
      }
    >
      <Button
        aria-invalid={issue === undefined ? undefined : true}
        aria-label={`${label} access: ${toolCount} enabled. Configure tools.`}
        className={cn(
          "gap-1.5",
          onRemove !== undefined && "rounded-r-none",
          invalid
        )}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <ProviderLogo className="size-3.5" surface={surface.integration} />
        {label}
        <span className="text-muted-foreground tabular-nums">
          {surface.tools.length}
        </span>
      </Button>
      {onRemove === undefined ? null : (
        <Button
          aria-invalid={issue === undefined ? undefined : true}
          aria-label={`Remove ${label} access`}
          className={cn("rounded-l-none border-l-0", invalid)}
          onClick={() => onRemove(surface.integration)}
          size="icon"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" className="size-3" />
        </Button>
      )}
      <JobSurfaceToolsDialog
        integration={surface.integration}
        onOpenChange={setOpen}
        onToolsChange={(tools) => onChange({ ...surface, tools })}
        open={open}
        permissions={permissions}
        tools={surface.tools}
        toolSurfaceLabel={label}
      />
    </div>
  )
}
