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
import { ReadonlyToolGroups } from "@/console/permissions/tools"
import { SeparatorDot } from "../../dot"
import { type ExecutionDetailGroup } from "../types"
import { ProviderLogo } from "./source"

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
  const counts = countTools(group.tools)

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
      <span
        aria-hidden="true"
        className="w-[0.5px] shrink-0 self-stretch bg-border"
      />
      <ToolCounts
        approval={counts.approval}
        read={counts.read}
        write={counts.write}
      />
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover/tool-row:text-foreground" />
    </button>
  )
}

function ToolCounts({
  approval,
  read,
  write,
}: {
  approval: number
  read: number
  write: number
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span>Read {read}</span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span>Write {write}</span>
      {approval > 0 ? (
        <>
          <SeparatorDot className="shrink-0 text-muted-foreground/60" />
          <span>Approval {approval}</span>
        </>
      ) : null}
    </span>
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
      <ReadonlyToolGroups tools={group.tools} />
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

function countTools(tools: ExecutionDetailGroup["tools"]) {
  const counts = { read: 0, write: 0, approval: 0 }

  for (const tool of tools) {
    counts[tool.access] += 1
    if (tool.requiresApproval === true) {
      counts.approval += 1
    }
  }

  return counts
}
