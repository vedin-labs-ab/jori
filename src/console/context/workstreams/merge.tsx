import { useMutation } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "../../../../convex/_generated/api"
import { type Workstream, type Workstreams } from "./card"

// Folds this workstream into the chosen one; its history stays on the
// tombstone and the target carries the work forward.
export function MergeDialog({
  tenantId,
  workstream,
  workstreams,
  onClose,
}: {
  tenantId: string
  workstream: Workstream | null
  workstreams: Workstreams
  onClose: () => void
}) {
  const merge = useMutation(api.deduction.console.corrections.merge)
  const [intoId, setIntoId] = useState<string>("")
  const targets = workstreams.filter(
    (candidate) =>
      candidate.id !== workstream?.id && candidate.status !== "rejected"
  )

  const submit = async () => {
    if (workstream === null || intoId === "") {
      return
    }

    await merge({
      tenantId,
      workstreamId: workstream.id,
      intoId: intoId as Workstream["id"],
    })
    onClose()
  }

  return (
    <Dialog
      open={workstream !== null}
      onOpenChange={(open) => {
        if (!open) {
          setIntoId("")
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge "{workstream?.name}"</DialogTitle>
          <DialogDescription>
            Pick the workstream this one is a duplicate of. Milo keeps the
            target and its combined history.
          </DialogDescription>
        </DialogHeader>
        <Select value={intoId} onValueChange={setIntoId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Merge into…" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id}>
                {candidate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={intoId === ""} onClick={submit}>
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
