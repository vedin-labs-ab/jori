import { useMutation } from "convex/react"
import { FilePenLine, Loader2 } from "lucide-react"
import { useState } from "react"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "../../../../convex/_generated/api"
import { type ContextFacts } from "../types"
import { type ProposalChange, proposalChanges, proposalName } from "./changes"

type ProposalReviewProps = {
  current: ContextFacts | null
  proposed: ContextFacts
  tenantId: string
}

export function ProposalReview({
  current,
  proposed,
  tenantId,
}: ProposalReviewProps) {
  const [open, setOpen] = useState(false)
  const changes = proposalChanges(current, proposed)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <ProposalAlert />
      <ProposalDialog
        changes={changes}
        onApproved={() => setOpen(false)}
        proposed={proposed}
        tenantId={tenantId}
      />
    </Dialog>
  )
}

function ProposalAlert() {
  return (
    <Alert className="bg-muted/20">
      <FilePenLine className="mt-0.5" />
      <AlertTitle>New proposal available</AlertTitle>
      <AlertDescription>
        Review changes before they are added to context.
      </AlertDescription>
      <AlertAction className="top-1/2 -translate-y-1/2">
        <DialogTrigger asChild>
          <Button size="sm" type="button">
            Review
          </Button>
        </DialogTrigger>
      </AlertAction>
    </Alert>
  )
}

function ProposalDialog({
  changes,
  onApproved,
  proposed,
  tenantId,
}: {
  changes: ProposalChange[]
  onApproved: () => void
  proposed: ContextFacts
  tenantId: string
}) {
  const approve = useMutation(api.organization.profile.approve)
  const [approving, setApproving] = useState(false)

  const onApprove = async () => {
    setApproving(true)

    try {
      await approve({ tenantId })
      onApproved()
    } finally {
      setApproving(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Review organization proposal</DialogTitle>
        <DialogDescription>
          Compare the approved context with the latest extraction before
          approving it.
        </DialogDescription>
      </DialogHeader>
      <ChangeList changes={changes} proposed={proposed} />
      <DialogFooter>
        <Button disabled={approving} onClick={onApproved} variant="outline">
          Cancel
        </Button>
        <Button disabled={approving} onClick={() => void onApprove()}>
          {approving ? <Loader2 className="animate-spin" /> : null}
          {approving ? "Approving" : "Approve"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function ChangeList({
  changes,
  proposed,
}: {
  changes: ProposalChange[]
  proposed: ContextFacts
}) {
  if (changes.length === 0) {
    return (
      <div className="rounded-md border p-3 text-muted-foreground text-xs/relaxed">
        No visible changes were found in this proposal.
      </div>
    )
  }

  return (
    <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
      {changes.map((change) => (
        <ChangeSection change={change} key={change.field} />
      ))}
      <p className="text-muted-foreground text-xs/relaxed">
        Approving replaces the approved organization context with the proposed
        facts for {proposalName(proposed)}.
      </p>
    </div>
  )
}

function ChangeSection({ change }: { change: ProposalChange }) {
  return (
    <section className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-medium">{change.field}</h3>
        <Badge variant="secondary">{change.status}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ChangeColumn label="Before" lines={change.before} />
        <ChangeColumn label="After" lines={change.after} />
        <ChangeColumn label="Delta" lines={change.delta} />
      </div>
    </section>
  )
}

function ChangeColumn({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="grid gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ValueList lines={lines} />
    </div>
  )
}

function ValueList({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return (
      <div className="rounded-md bg-muted/30 p-2 text-muted-foreground text-xs/relaxed">
        None
      </div>
    )
  }

  return (
    <ul className="grid gap-1 rounded-md bg-muted/30 p-2 text-xs/relaxed">
      {lines.map((line) => (
        <li className="break-words" key={line}>
          {line}
        </li>
      ))}
    </ul>
  )
}
