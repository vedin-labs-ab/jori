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

/** Access a job holds that its instructions do not name with an `@`: what
 *  it holds that way, and a menu to add what it does not hold at all. */
export function AccessFields({
  additionalSurfaces,
  available,
  onAdditionalSurfaceAdd,
  onAdditionalSurfaceChange,
  onAdditionalSurfaceRemove,
  permissions,
  scope,
}: {
  additionalSurfaces: JobSurfaceFormValue[]
  /** The integrations the job holds no access to yet. */
  available: readonly JobSurfaceIntegration[]
  onAdditionalSurfaceAdd: (integration: JobSurfaceIntegration) => void
  onAdditionalSurfaceChange: (surface: JobSurfaceFormValue) => void
  onAdditionalSurfaceRemove: (integration: JobSurfaceIntegration) => void
  permissions: JobPolicyPermissions
  scope: JobScope
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-normal text-xs">Additional access</Label>
        <AddAccess available={available} onAdd={onAdditionalSurfaceAdd} />
      </div>
      {additionalSurfaces.length === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {additionalSurfaces.map((surface) => (
            <AdditionalSurface
              key={surface.integration}
              onChange={onAdditionalSurfaceChange}
              onRemove={onAdditionalSurfaceRemove}
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

function AdditionalSurface({
  onChange,
  onRemove,
  permissions,
  scope,
  surface,
}: {
  onChange: (surface: JobSurfaceFormValue) => void
  onRemove: (integration: JobSurfaceIntegration) => void
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

  return (
    <div
      className={cn(
        "inline-flex rounded-md",
        issue !== undefined && "ring-2 ring-destructive/20"
      )}
      title={issue}
    >
      <Button
        aria-invalid={issue === undefined ? undefined : true}
        aria-label={`${label} additional access: ${toolCount} enabled. Configure tools.`}
        className={cn(
          "gap-1.5 rounded-r-none",
          issue !== undefined &&
            "border-destructive/60 bg-destructive/5 text-destructive"
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
      <Button
        aria-invalid={issue === undefined ? undefined : true}
        aria-label={`Remove additional ${label} access`}
        className={cn(
          "rounded-l-none border-l-0",
          issue !== undefined &&
            "border-destructive/60 bg-destructive/5 text-destructive"
        )}
        onClick={() => onRemove(surface.integration)}
        size="icon"
        type="button"
        variant="outline"
      >
        <X aria-hidden="true" className="size-3" />
      </Button>
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
