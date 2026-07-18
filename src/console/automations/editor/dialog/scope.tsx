import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FieldHelp } from "../../help"

export function ScopeField({
  onValueChange,
  value,
}: {
  onValueChange: (scope: Scope) => void
  value: Scope
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="automation-scope">Sharing</Label>
        <FieldHelp label="Sharing help">
          <p>
            Personal: only you can manage it. Runs use your context and
            connected accounts.
          </p>
          <p>
            Organization: everyone can manage it. Runs use organization context
            and shared integrations only.
          </p>
        </FieldHelp>
      </div>
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
    </div>
  )
}
