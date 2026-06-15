import { type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../dot"
import {
  accessLabel,
  groupToolsByAccess,
  type ToolAccess,
  type ToolAccessGroup,
  type ToolCapability,
} from "./model"

export function ReadonlyToolGroups({ tools }: { tools: ToolCapability[] }) {
  return (
    <ToolGroupsFrame>
      {groupToolsByAccess(tools).map((group) => (
        <ReadonlyToolGroup group={group} key={group.access} />
      ))}
    </ToolGroupsFrame>
  )
}

export function ToolGroupsFrame({ children }: { children: ReactNode }) {
  return <div className="grid gap-5">{children}</div>
}

export function ToolGroupSection({
  access,
  action,
  badge,
  children,
}: {
  access: ToolAccess
  action?: ReactNode
  badge: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="font-medium text-sm">{accessLabel(access)}</h3>
          <Badge
            className="shrink-0 font-normal text-muted-foreground"
            variant="secondary"
          >
            {badge}
          </Badge>
        </div>
        {action}
      </div>
      <ScrollArea className="max-h-[250px] rounded-md border [&>[data-slot=scroll-area-viewport]]:max-h-[250px]">
        {children}
      </ScrollArea>
    </section>
  )
}

export function ToolRowContent({
  accessories,
  description,
  descriptionId,
  muted = false,
  title,
}: {
  accessories?: ReactNode
  description: string
  descriptionId?: string
  muted?: boolean
  title: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {title}
        {accessories}
      </div>
      <p
        className={cn(
          "text-muted-foreground text-xs leading-relaxed",
          muted && "text-muted-foreground/80"
        )}
        id={descriptionId}
      >
        {description}
      </p>
    </div>
  )
}

function ReadonlyToolGroup({
  group,
}: {
  group: ToolAccessGroup<ToolCapability>
}) {
  return (
    <ToolGroupSection
      access={group.access}
      badge={`${group.tools.length} ${group.tools.length === 1 ? "tool" : "tools"}`}
    >
      {group.tools.map((tool) => (
        <ReadonlyToolRow key={tool.tool} tool={tool} />
      ))}
    </ToolGroupSection>
  )
}

function ReadonlyToolRow({ tool }: { tool: ToolCapability }) {
  return (
    <div className="border-b p-3 last:border-b-0">
      <ToolRowContent
        accessories={
          tool.requiresApproval === true ? (
            <>
              <SeparatorDot className="text-muted-foreground/60" />
              <span className="font-normal text-muted-foreground text-xs">
                Requires approval
              </span>
            </>
          ) : undefined
        }
        description={tool.description}
        title={<span className="font-medium text-sm">{tool.label}</span>}
      />
    </div>
  )
}
