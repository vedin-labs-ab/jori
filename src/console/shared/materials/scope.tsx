import { type Scope } from "@contracts/permissions/scope"
import { Badge } from "@/components/ui/badge"
import { ScopeField } from "../scope/field"

export function MaterialScopeBadge({ scope }: { scope: Scope }) {
  return (
    <Badge variant={scope === "personal" ? "outline" : "secondary"}>
      {scope === "personal" ? "Personal" : "Organization"}
    </Badge>
  )
}

/** Sharing picker for material create dialogs; organization by default.
 *  The same field the automation editor uses, with its help copy phrased
 *  for the material noun at hand. */
export function MaterialScopeField({
  id,
  noun,
  onScopeChange,
  scope,
}: {
  id: string
  noun: string
  onScopeChange: (scope: Scope) => void
  scope: Scope
}) {
  return (
    <ScopeField
      help={{
        organization: `everyone in the organization can see and use this ${noun}.`,
        personal: `only you can see and use this ${noun}.`,
      }}
      id={id}
      onValueChange={onScopeChange}
      value={scope}
    />
  )
}
