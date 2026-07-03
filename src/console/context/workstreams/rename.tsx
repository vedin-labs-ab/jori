import { useMutation } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api } from "../../../../convex/_generated/api"
import { type Workstream } from "./index"

export function RenameDialog({
  tenantId,
  workstream,
  onClose,
}: {
  tenantId: string
  workstream: Workstream | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={workstream !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename workstream</DialogTitle>
        </DialogHeader>
        {workstream === null ? null : (
          <RenameForm
            key={workstream.id}
            tenantId={tenantId}
            workstream={workstream}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  tenantId,
  workstream,
  onClose,
}: {
  tenantId: string
  workstream: Workstream
  onClose: () => void
}) {
  const rename = useMutation(api.deduction.console.rename)
  const [name, setName] = useState(workstream.name)
  const [brief, setBrief] = useState(workstream.brief)

  const submit = async () => {
    await rename({
      tenantId,
      workstreamId: workstream.id,
      name: name.trim(),
      brief: brief.trim(),
    })
    onClose()
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Input
          aria-label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          aria-label="Brief"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={name.trim() === "" || brief.trim() === ""}
          onClick={submit}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  )
}
