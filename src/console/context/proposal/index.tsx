import { useMutation } from "convex/react"
import { FilePenLine, Loader2 } from "lucide-react"
import { useState } from "react"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
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
import { Separator } from "@/components/ui/separator"
import { api } from "../../../../convex/_generated/api"
import { type ContextFacts, type OrganizationSources } from "../types"
import { ProposalReviewBody } from "./review"

type ProposalReviewProps = {
  current: ContextFacts | null
  primaryWebsite: string | undefined
  proposed: ContextFacts
  sources: OrganizationSources | undefined
  tenantId: string
}

export function ProposalReview({
  current,
  primaryWebsite,
  proposed,
  sources,
  tenantId,
}: ProposalReviewProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <ProposalAlert />
      <ProposalDialog
        current={current}
        onClose={() => setOpen(false)}
        primaryWebsite={primaryWebsite}
        proposed={proposed}
        sources={sources}
        tenantId={tenantId}
      />
    </Dialog>
  )
}

function ProposalAlert() {
  return (
    <Alert className="bg-muted/20">
      <FilePenLine />
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
  current,
  onClose,
  primaryWebsite,
  proposed,
  sources,
  tenantId,
}: {
  current: ContextFacts | null
  onClose: () => void
  primaryWebsite: string | undefined
  proposed: ContextFacts
  sources: OrganizationSources | undefined
  tenantId: string
}) {
  const approve = useMutation(api.organization.profile.approve)
  const [approving, setApproving] = useState(false)

  const onApprove = async () => {
    setApproving(true)

    try {
      await approve({ tenantId })
      onClose()
    } finally {
      setApproving(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Review proposed update</DialogTitle>
        <DialogDescription>
          Review the latest extraction before adding it to context.
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <ProposalReviewBody
        current={current}
        primaryWebsite={primaryWebsite}
        proposed={proposed}
        sources={sources}
      />
      <Separator />
      <DialogFooter>
        <Button disabled={approving} onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button disabled={approving} onClick={() => void onApprove()}>
          {approving ? <Loader2 className="animate-spin" /> : null}
          {approving ? "Approving" : "Approve update"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
