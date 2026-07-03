import { useMutation } from "convex/react"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { type Workstream } from "./types"

// One action vocabulary for the detail dialog. Adoption decisions come first.
export type WorkstreamAction =
  | "confirm"
  | "reject"
  | "archive"
  | "reopen"
  | "restore"

function actionsFor(status: Workstream["status"]): WorkstreamAction[] {
  switch (status) {
    case "proposed":
      return ["confirm", "reject"]
    case "confirmed":
      return ["archive"]
    case "closed":
      return ["reopen"]
    case "rejected":
      return ["restore"]
  }
}

const labels: Record<WorkstreamAction, string> = {
  confirm: "Confirm",
  reject: "Not a workstream",
  archive: "Archive",
  reopen: "Reopen",
  restore: "Restore",
}

export function WorkstreamActions({
  tenantId,
  workstream,
}: {
  tenantId: string
  workstream: Workstream
}) {
  const confirm = useMutation(api.deduction.console.corrections.confirm)
  const reject = useMutation(api.deduction.console.corrections.reject)
  const archive = useMutation(api.deduction.console.corrections.archive)
  const reopen = useMutation(api.deduction.console.corrections.reopen)
  const restore = useMutation(api.deduction.console.corrections.restore)
  const target = { tenantId, workstreamId: workstream.id }
  const run: Record<WorkstreamAction, () => void> = {
    confirm: () => void confirm(target),
    reject: () => void reject(target),
    archive: () => void archive(target),
    reopen: () => void reopen(target),
    restore: () => void restore(target),
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
