import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { type AutomationReadScope } from "../../surfaces"

export function AccessFields({
  onReadScopeChange,
  onWebSearchChange,
  readScope,
  webSearch,
}: {
  onReadScopeChange: (readScope: AutomationReadScope) => void
  onWebSearchChange: (webSearch: boolean) => void
  readScope: AutomationReadScope
  webSearch: boolean
}) {
  return (
    <div className="grid gap-2">
      <h3 className="font-medium text-xs">Access</h3>
      <div className="grid gap-2">
        <AccessCheckbox
          checked={readScope === "allConnected"}
          description="For context from integrations you do not mention."
          id="automation-all-reads"
          label="Let Milo read any connected integration"
          onCheckedChange={(checked) =>
            onReadScopeChange(checked ? "allConnected" : "selected")
          }
        />
        <AccessCheckbox
          checked={webSearch}
          description="For current public information."
          id="automation-web-search"
          label="Let Milo search the web"
          onCheckedChange={onWebSearchChange}
        />
      </div>
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
