import { type Scope } from "@contracts/permissions/scope"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function MaterialScopeBadge({ scope }: { scope: Scope }) {
  return (
    <Badge variant={scope === "personal" ? "outline" : "secondary"}>
      {scope === "personal" ? "Personal" : "Organization"}
    </Badge>
  )
}

/** Visibility picker for material create dialogs; organization by default. */
export function MaterialScopeField({
  id,
  onScopeChange,
  scope,
}: {
  id: string
  onScopeChange: (scope: Scope) => void
  scope: Scope
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Visibility</Label>
      <Select
        onValueChange={(value) => onScopeChange(value as Scope)}
        value={scope}
      >
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="organization">
            Everyone in the organization
          </SelectItem>
          <SelectItem value="personal">Only me</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
