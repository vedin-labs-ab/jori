import { X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  getJobSurfaceLabel,
  getJobSurfaceScopeIssue,
  type JobScope,
  type JobSurfaceFormValue,
} from "../../access"
import { SurfaceLogo } from "../../access/logo"
import { type JobPolicyPermissions } from "../../access/policy"
import { JobSurfaceToolsDialog } from "../instructions/access/tools"

export function AccessFields({
  additionalSurfaces,
  onAdditionalSurfaceChange,
  onAdditionalSurfaceRemove,
  onWebSearchChange,
  permissions,
  scope,
  organizationId,
  webSearch,
}: {
  additionalSurfaces: JobSurfaceFormValue[]
  onAdditionalSurfaceChange: (surface: JobSurfaceFormValue) => void
  onAdditionalSurfaceRemove: (
    integration: JobSurfaceFormValue["integration"]
  ) => void
  onWebSearchChange: (webSearch: boolean) => void
  permissions: JobPolicyPermissions
  scope: JobScope
  organizationId: string
  webSearch: boolean
}) {
  return (
    <div className="grid gap-3">
      <AccessCheckbox
        checked={webSearch}
        description="For current public information."
        id="job-web-search"
        label="Let Jori search the web"
        onCheckedChange={onWebSearchChange}
      />
      {additionalSurfaces.length === 0 ? null : (
        <div className="grid gap-1.5">
          <div>
            <Label className="font-normal text-xs">Additional access</Label>
            <p className="text-muted-foreground text-xs">
              Access saved outside the instruction references.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {additionalSurfaces.map((surface) => (
              <AdditionalSurface
                key={surface.integration}
                onChange={onAdditionalSurfaceChange}
                onRemove={onAdditionalSurfaceRemove}
                permissions={permissions}
                scope={scope}
                surface={surface}
                organizationId={organizationId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AdditionalSurface({
  onChange,
  onRemove,
  permissions,
  scope,
  surface,
  organizationId,
}: {
  onChange: (surface: JobSurfaceFormValue) => void
  onRemove: (integration: JobSurfaceFormValue["integration"]) => void
  permissions: JobPolicyPermissions
  scope: JobScope
  surface: JobSurfaceFormValue
  organizationId: string
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
        <SurfaceLogo integration={surface.integration} />
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
        organizationId={organizationId}
        tools={surface.tools}
        toolSurfaceLabel={label}
      />
    </div>
  )
}

function AccessCheckbox({
  checked,
  description,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  id: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="font-normal text-xs">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  )
}
