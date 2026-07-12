import { X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  type AutomationSurfaceFormValue,
  getAutomationSurfaceLabel,
} from "../../access"
import { SurfaceLogo } from "../../access/logo"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { AutomationSurfaceToolsDialog } from "../instructions/access/tools"

export function AccessFields({
  additionalSurfaces,
  onAdditionalSurfaceChange,
  onAdditionalSurfaceRemove,
  onWebSearchChange,
  permissions,
  webSearch,
}: {
  additionalSurfaces: AutomationSurfaceFormValue[]
  onAdditionalSurfaceChange: (surface: AutomationSurfaceFormValue) => void
  onAdditionalSurfaceRemove: (
    integration: AutomationSurfaceFormValue["integration"]
  ) => void
  onWebSearchChange: (webSearch: boolean) => void
  permissions: AutomationPolicyPermissions
  webSearch: boolean
}) {
  return (
    <div className="grid gap-3">
      <AccessCheckbox
        checked={webSearch}
        description="For current public information."
        id="automation-web-search"
        label="Let Milo search the web"
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
                surface={surface}
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
  surface,
}: {
  onChange: (surface: AutomationSurfaceFormValue) => void
  onRemove: (integration: AutomationSurfaceFormValue["integration"]) => void
  permissions: AutomationPolicyPermissions
  surface: AutomationSurfaceFormValue
}) {
  const [open, setOpen] = useState(false)
  const label = getAutomationSurfaceLabel(surface.integration)
  const toolCount = `${surface.tools.length} tool${
    surface.tools.length === 1 ? "" : "s"
  }`

  return (
    <div className="inline-flex">
      <Button
        aria-label={`${label} additional access: ${toolCount} enabled. Configure tools.`}
        className="h-7 gap-1.5 rounded-r-none px-2 text-xs"
        onClick={() => setOpen(true)}
        size="sm"
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
        aria-label={`Remove additional ${label} access`}
        className="h-7 w-7 rounded-l-none border-l-0"
        onClick={() => onRemove(surface.integration)}
        size="icon"
        type="button"
        variant="outline"
      >
        <X aria-hidden="true" className="size-3" />
      </Button>
      <AutomationSurfaceToolsDialog
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
