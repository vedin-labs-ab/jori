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
import { api } from "../../../../convex/_generated/api"
import {
  type ContextFacts,
  type ContextProposal,
  type OrganizationSources,
} from "../types"
import { ProposalReviewBody } from "./review"

type ProposalReviewProps = {
  current: ContextFacts | null
  onOpenChange?: (open: boolean) => void
  open?: boolean
  primaryWebsite: string | undefined
  proposed: ContextProposal
  sources: OrganizationSources | undefined
  tenantId: string
}

export function ProposalReview({
  current,
  onOpenChange,
  open,
  primaryWebsite,
  proposed,
  sources,
  tenantId,
}: ProposalReviewProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const dialogOpen = open ?? localOpen
  const setDialogOpen = onOpenChange ?? setLocalOpen

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      <ProposalAlert />
      <ProposalDialog
        current={current}
        onClose={() => setDialogOpen(false)}
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
  proposed: ContextProposal
  sources: OrganizationSources | undefined
  tenantId: string
}) {
  const approve = useMutation(api.organization.profile.approve)
  const dismiss = useMutation(api.organization.profile.dismiss)
  const [pendingAction, setPendingAction] = useState<
    "approve" | "dismiss" | null
  >(null)

  const onApprove = async () => {
    setPendingAction("approve")

    try {
      await approve({ tenantId })
      onClose()
    } finally {
      setPendingAction(null)
    }
  }

  const onDismiss = async () => {
    setPendingAction("dismiss")

    try {
      await dismiss({ tenantId })
      onClose()
    } finally {
      setPendingAction(null)
    }
  }

  const pending = pendingAction !== null

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Review proposed update</DialogTitle>
        <DialogDescription>
          Review the latest extraction before adding it to context.
        </DialogDescription>
      </DialogHeader>
      <ProposalReviewBody
        current={current}
        primaryWebsite={primaryWebsite}
        proposed={proposed}
        sources={sources}
      />
      <DialogFooter>
        <Button
          disabled={pending}
          onClick={() => void onDismiss()}
          variant="outline"
        >
          {pendingAction === "dismiss" ? (
            <Loader2 className="animate-spin" />
          ) : null}
          {pendingAction === "dismiss" ? "Discarding" : "Discard proposal"}
        </Button>
        <Button disabled={pending} onClick={() => void onApprove()}>
          {pendingAction === "approve" ? (
            <Loader2 className="animate-spin" />
          ) : null}
          {pendingAction === "approve" ? "Approving" : "Approve update"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
