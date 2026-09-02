import { useMutation } from "convex/react"
import { Button } from "@/components/ui/button"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../../convex/_generated/api"
import { type Workstream } from "../types"

// One action vocabulary for the detail dialog. Adoption decisions come first.
type WorkstreamAction = "confirm" | "reject" | "archive" | "reopen" | "restore"

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
  organizationId,
  workstream,
}: {
  organizationId: string
  workstream: Workstream
}) {
  const confirm = useMutation(api.workstreams.corrections.confirm)
  const reject = useMutation(api.workstreams.corrections.reject)
  const archive = useMutation(api.workstreams.corrections.archive)
  const reopen = useMutation(api.workstreams.corrections.reopen)
  const restore = useMutation(api.workstreams.corrections.restore)
  const target = { organizationId, workstreamId: workstream.id }
  const runAction = (mutation: (args: typeof target) => Promise<unknown>) => {
    void mutation(target).catch((error: unknown) => {
      showErrorToast(error, "Couldn't update the workstream.")
    })
  }
  const run: Record<WorkstreamAction, () => void> = {
    confirm: () => runAction(confirm),
    reject: () => runAction(reject),
    archive: () => runAction(archive),
    reopen: () => runAction(reopen),
    restore: () => runAction(restore),
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
