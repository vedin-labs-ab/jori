import { useMutation, useQuery } from "convex/react"
import { Lock, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "../../../../convex/_generated/api"
import { relativeTime } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { RenameDialog } from "./rename"

type Workstreams = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.list>>
>["workstreams"]
export type Workstream = Workstreams[number]

// Milo's deduced picture of the org's active work. Read-only rows with light
// corrections; a corrected workstream is locked against the judge.
export function ContextWorkstreams({ tenantId }: { tenantId: string }) {
  const result = useQuery(api.deduction.console.list, { tenantId })
  const [renaming, setRenaming] = useState<Workstream | null>(null)
  const workstreams = result?.workstreams ?? []

  return (
    <div className="flex flex-col gap-3">
      <ContextSectionTitle count={workstreams.length}>
        Workstreams
      </ContextSectionTitle>
      {workstreams.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing deduced yet. Milo reviews activity daily and lists the bodies
          of work it finds here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {workstreams.map((workstream) => (
            <WorkstreamRow
              key={workstream.id}
              tenantId={tenantId}
              workstream={workstream}
              onRename={() => setRenaming(workstream)}
            />
          ))}
        </ul>
      )}
      <RenameDialog
        tenantId={tenantId}
        workstream={renaming}
        onClose={() => setRenaming(null)}
      />
    </div>
  )
}

function WorkstreamRow({
  tenantId,
  workstream,
  onRename,
}: {
  tenantId: string
  workstream: Workstream
  onRename: () => void
}) {
  const latest = workstream.journal[0]

  return (
    <li className="flex flex-col gap-1 p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{workstream.name}</span>
        <Badge variant="outline">{workstream.status}</Badge>
        {workstream.locked ? (
          <Lock aria-label="Locked" className="size-3 text-muted-foreground" />
        ) : null}
        <span className="ml-auto text-muted-foreground text-xs">
          seen {relativeTime(workstream.seenAt, Date.now())} ·{" "}
          {workstream.evidenceCount} sightings
        </span>
        <WorkstreamActions
          tenantId={tenantId}
          workstream={workstream}
          onRename={onRename}
        />
      </div>
      <p className="text-muted-foreground text-sm">{workstream.brief}</p>
      {latest === undefined ? null : (
        <p className="text-muted-foreground/70 text-xs">{latest.entry}</p>
      )}
    </li>
  )
}

function WorkstreamActions({
  tenantId,
  workstream,
  onRename,
}: {
  tenantId: string
  workstream: Workstream
  onRename: () => void
}) {
  const close = useMutation(api.deduction.console.close)
  const setLock = useMutation(api.deduction.console.setLock)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Workstream actions" size="icon-sm" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>Rename…</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setLock({
              tenantId,
              workstreamId: workstream.id,
              locked: !workstream.locked,
            })
          }
        >
          {workstream.locked ? "Unlock" : "Lock"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={workstream.status === "closed"}
          onClick={() => close({ tenantId, workstreamId: workstream.id })}
        >
          Close
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
