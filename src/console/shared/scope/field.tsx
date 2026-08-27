import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FieldHelp } from "@/shared/field"

/**
 * "Sharing" field for anything that is either personal or shared with the
 * organization. What personal and organization mean differs by subject, so
 * each call site supplies one sentence per audience; the field prefixes them
 * with the audience labels it also renders as options.
 */
export function ScopeField({
  help,
  id,
  onValueChange,
  value,
}: {
  help: { organization: string; personal: string }
  id: string
  onValueChange: (scope: Scope) => void
  value: Scope
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>Sharing</Label>
        <FieldHelp label="Sharing help">
          <p>
            {scopeLabels.personal}: {help.personal}
          </p>
          <p>
            {scopeLabels.organization}: {help.organization}
          </p>
        </FieldHelp>
      </div>
      <ToggleGroup
        className="justify-start"
        id={id}
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
