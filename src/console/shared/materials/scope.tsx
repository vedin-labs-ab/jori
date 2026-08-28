import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScopeIcon } from "../details"
import { ScopeField } from "../scope/field"

/** Muted scope icon with its label in a tooltip and for screen readers:
 *  the material heading treatment, also the breadcrumb's scope suffix. */
export function MaterialScopeMark({ scope }: { scope: Scope }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 text-muted-foreground">
          <ScopeIcon className="size-4" scope={scope} />
          <span className="sr-only">{scopeLabels[scope]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{scopeLabels[scope]}</TooltipContent>
    </Tooltip>
  )
}

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
