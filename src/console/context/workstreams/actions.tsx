import { useMutation } from "convex/react"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { type Workstream } from "./types"

// One action vocabulary for cards and the detail dialog. Adoption decisions
// come first; edit and merge are always available while a workstream is live.
export type WorkstreamAction =
  | "confirm"
  | "reject"
  | "close"
  | "reopen"
  | "restore"
  | "edit"
  | "merge"

function actionsFor(status: Workstream["status"]): WorkstreamAction[] {
  switch (status) {
    case "proposed":
      return ["confirm", "edit", "merge", "reject"]
    case "confirmed":
      return ["close", "edit", "merge"]
    case "closed":
      return ["reopen"]
    case "rejected":
      return ["restore"]
  }
}

const labels: Record<WorkstreamAction, string> = {
  confirm: "Confirm",
  reject: "Not a workstream",
  close: "Close",
  reopen: "Reopen",
  restore: "Restore",
  edit: "Edit",
  merge: "Merge into…",
}

export function WorkstreamActions({
  tenantId,
  workstream,
  onEdit,
  onMerge,
}: {
  tenantId: string
  workstream: Workstream
  onEdit: () => void
  onMerge: () => void
}) {
  const confirm = useMutation(api.deduction.console.corrections.confirm)
  const reject = useMutation(api.deduction.console.corrections.reject)
  const close = useMutation(api.deduction.console.corrections.close)
  const reopen = useMutation(api.deduction.console.corrections.reopen)
  const restore = useMutation(api.deduction.console.corrections.restore)
  const target = { tenantId, workstreamId: workstream.id }
  const run: Record<WorkstreamAction, () => void> = {
    confirm: () => void confirm(target),
    reject: () => void reject(target),
    close: () => void close(target),
    reopen: () => void reopen(target),
    restore: () => void restore(target),
    edit: onEdit,
    merge: onMerge,
  }
  const actions = actionsFor(workstream.status)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action, index) => (
        <Button
          key={action}
          size="sm"
          variant={index === 0 ? "default" : "outline"}
          onClick={run[action]}
        >
          {labels[action]}
        </Button>
      ))}
    </div>
  )
}
