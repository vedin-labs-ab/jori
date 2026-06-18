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
import { SeparatorDot } from "../../shared/dot"
import { type ExecutionDetailGroup } from "../types"
import { ProviderLogo } from "./source"

export function ExecutionToolsValue({
  description = "Tools available to this execution.",
  groups,
}: {
  description?: string
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
          <ToolGroupDialog description={description} group={activeGroup} />
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
  const hasToolCounts = counts.read > 0 || counts.write > 0

  return (
    <button
      aria-label={`Open ${group.label} tools`}
      className="group/tool-row inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-border/70 px-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={onClick}
      type="button"
    >
      <ProviderLogo className="size-3.5" surface={group.type} />
      <span className="shrink-0 font-medium text-foreground">
        {group.label}
      </span>
      {hasToolCounts ? (
        <>
          <span
            aria-hidden="true"
            className="w-[0.5px] shrink-0 self-stretch bg-border"
          />
          <ToolCounts
            read={counts.read}
            readRequiresApproval={counts.readRequiresApproval}
            write={counts.write}
            writeRequiresApproval={counts.writeRequiresApproval}
          />
        </>
      ) : null}
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover/tool-row:text-foreground" />
    </button>
  )
}

function ToolCounts({
  read,
  readRequiresApproval,
  write,
  writeRequiresApproval,
}: {
  read: number
  readRequiresApproval: boolean
  write: number
  writeRequiresApproval: boolean
}) {
  const hasReadTools = read > 0
  const hasWriteTools = write > 0

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {hasReadTools ? (
        <ToolCount
          label="Read"
          requiresApproval={readRequiresApproval}
          value={read}
        />
      ) : null}
      {hasReadTools && hasWriteTools ? (
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      ) : null}
      {hasWriteTools ? (
        <ToolCount
          label="Write"
          requiresApproval={writeRequiresApproval}
          value={write}
        />
      ) : null}
    </span>
  )
}

function ToolCount({
  label,
  requiresApproval,
  value,
}: {
  label: string
  requiresApproval: boolean
  value: number
}) {
  return (
    <span>
      {label} {value}
      {requiresApproval ? (
        <span aria-hidden="true" className="text-warning">
          *
        </span>
      ) : null}
    </span>
  )
}

function ToolGroupDialog({
  description,
  group,
}: {
  description: string
  group: ExecutionDetailGroup
}) {
  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader className="grid grid-cols-[auto_1fr] gap-3 pr-8 text-left">
        <ProviderLogo className="mt-0.5 size-6" surface={group.type} />
        <div className="grid gap-1">
          <DialogTitle>{group.label} tools</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
  const counts = {
    read: 0,
    readRequiresApproval: false,
    write: 0,
    writeRequiresApproval: false,
  }

  for (const tool of tools) {
    counts[tool.access] += 1
    if (tool.requiresApproval === true) {
      if (tool.access === "read") {
        counts.readRequiresApproval = true
      } else {
        counts.writeRequiresApproval = true
      }
    }
  }

  return counts
}
