import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function AccessFields({
  onWebSearchChange,
  webSearch,
}: {
  onWebSearchChange: (webSearch: boolean) => void
  webSearch: boolean
}) {
  return (
    <AccessCheckbox
      checked={webSearch}
      description="For current public information."
      id="automation-web-search"
      label="Let Milo search the web"
      onCheckedChange={onWebSearchChange}
    />
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
