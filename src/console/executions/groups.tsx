import { ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReadonlyAutomationSurfaceToolGroups } from "@/console/automations/editor/instructions/sections"
import { SeparatorDot } from "../dot"
import { ProviderLogo } from "./source"
import { type ExecutionDetailGroup } from "./types"

export function ExecutionToolsValue({
  groups,
}: {
  groups: ExecutionDetailGroup[]
}) {
  const [activeGroup, setActiveGroup] = useState<ExecutionDetailGroup>()

  return (
    <>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {groups.map((group) => (
          <li key={`${group.type}:${group.label}`}>
            <ToolGroupButton
              group={group}
              onClick={() => setActiveGroup(group)}
            />
          </li>
        ))}
      </ul>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setActiveGroup(undefined)
          }
        }}
        open={activeGroup !== undefined}
      >
        {activeGroup === undefined ? null : (
          <ToolGroupDialog group={activeGroup} />
        )}
      </Dialog>
    </>
  )
}

function ToolGroupButton({
  group,
  onClick,
}: {
  group: ExecutionDetailGroup
  onClick: () => void
}) {
  const counts = countToolsByAccess(group.tools)

  return (
    <button
      aria-label={`Open ${group.label} tools`}
      className="group/tool-row inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-border/70 px-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={onClick}
      type="button"
    >
      <ProviderLogo className="size-3.5" provider={group.type} />
      <span className="shrink-0 font-medium text-foreground">
        {group.label}
      </span>
      <ToolCount label="Read" value={counts.read} />
      <ToolCount label="Write" value={counts.write} />
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover/tool-row:text-foreground" />
    </button>
  )
}

function ToolCount({ label, value }: { label: string; value: number }) {
  return (
    <>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span className="shrink-0">
        {label} {value}
      </span>
    </>
  )
}

function ToolGroupDialog({ group }: { group: ExecutionDetailGroup }) {
  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader className="grid grid-cols-[auto_1fr] gap-3 pr-8 text-left">
        <ProviderLogo className="mt-0.5 size-6" provider={group.type} />
        <div className="grid gap-1">
          <DialogTitle>{group.label} tools</DialogTitle>
          <DialogDescription>
            Tools available to this execution.
          </DialogDescription>
        </div>
      </DialogHeader>
      <ReadonlyAutomationSurfaceToolGroups tools={group.tools} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Close
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}

function countToolsByAccess(tools: ExecutionDetailGroup["tools"]) {
  const counts = { read: 0, write: 0 }

  for (const tool of tools) {
    counts[tool.access] += 1
  }

  return counts
}
