import { SeparatorDot } from "../dot"
import { ProviderLogo } from "./source"
import { type ExecutionDetailGroup } from "./types"

export function GroupedFactValue({
  groups,
}: {
  groups: ExecutionDetailGroup[]
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {groups.map((group, index) => (
        <ToolGroup
          group={group}
          key={`${group.type}:${group.label}`}
          showSeparator={index > 0}
        />
      ))}
    </span>
  )
}

function ToolGroup({
  group,
  showSeparator,
}: {
  group: ExecutionDetailGroup
  showSeparator: boolean
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {showSeparator ? (
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      ) : null}
      <ProviderLogo className="size-3.5" provider={group.type} />
      <span className="shrink-0 font-medium text-foreground">
        {group.label}
      </span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 truncate text-foreground">
        {group.values.join(", ")}
      </span>
    </span>
  )
}
