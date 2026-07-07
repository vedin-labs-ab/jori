import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const scopeDescriptions: Record<Scope, string> = {
  personal: "Only you can see and manage it, runs included.",
  organization: "Everyone in your organization can see and manage it.",
}

export function ScopeField({
  onValueChange,
  value,
}: {
  onValueChange: (scope: Scope) => void
  value: Scope
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="font-normal text-xs" htmlFor="automation-scope">
        Sharing
      </Label>
      <ToggleGroup
        className="justify-start"
        id="automation-scope"
        onValueChange={(next) => {
          if (next !== "") {
            onValueChange(next as Scope)
          }
        }}
        type="single"
        value={value}
        variant="outline"
      >
        <ToggleGroupItem value="personal">
          {scopeLabels.personal}
        </ToggleGroupItem>
        <ToggleGroupItem value="organization">
          {scopeLabels.organization}
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">
        {scopeDescriptions[value]}
      </p>
    </div>
  )
}
