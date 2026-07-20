import { useMutation, usePaginatedQuery } from "convex/react"
import { Link2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { absoluteTime, useNow } from "../../shared/time"
import { type ArtifactDetail } from "../types"
import { ArtifactRailLabel, artifactRailButtonClassName } from "./rail"

const sharePageSize = 8

type ArtifactId = ArtifactDetail["artifactId"]
type ShareLink = NonNullable<
  ReturnType<
    typeof usePaginatedQuery<typeof api.artifacts.console.pageShares>
  >["results"]
>[number]

export function ArtifactLinks({
  artifactId,
  organizationId,
}: {
  artifactId: ArtifactId
  organizationId: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <div className="group/action absolute top-12 left-0 z-30 w-28">
        <DialogTrigger asChild>
          <Button
            aria-label="Manage share links"
            className={artifactRailButtonClassName}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Link2 />
            <ArtifactRailLabel>Links</ArtifactRailLabel>
          </Button>
        </DialogTrigger>
      </div>
      <ArtifactLinksDialog
        artifactId={artifactId}
        open={open}
        organizationId={organizationId}
      />
    </Dialog>
  )
}

function ArtifactLinksDialog({
  artifactId,
  open,
  organizationId,
}: {
  artifactId: ArtifactId
  open: boolean
  organizationId: string
}) {
  const shares = usePaginatedQuery(
    api.artifacts.console.pageShares,
    open ? { artifactId, organizationId } : "skip",
    { initialNumItems: sharePageSize }
  )

  return (
    <DialogContent bodyClassName="gap-0 p-0" className="sm:max-w-md">
      <DialogHeader className="p-4 pr-10">
        <DialogTitle>Links</DialogTitle>
        <DialogDescription className="sr-only">
          Manage active and expired share links for this artifact.
        </DialogDescription>
      </DialogHeader>
      <ShareLinksContent
        artifactId={artifactId}
        loadMore={shares.loadMore}
        results={shares.results}
        status={shares.status}
        organizationId={organizationId}
      />
    </DialogContent>
  )
}

function ShareLinksContent({
  artifactId,
  loadMore,
  results,
  status,
  organizationId,
}: {
  artifactId: ArtifactId
  loadMore: (count: number) => void
  results: ShareLink[]
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted"
  organizationId: string
}) {
  const now = useNow(30_000)
  const revokeShare = useMutation(api.artifacts.console.revokeShare)
  const [revokingShareId, setRevokingShareId] = useState<
    ShareLink["shareId"] | null
  >(null)
  const revoke = (shareId: ShareLink["shareId"]) => {
    setRevokingShareId(shareId)
    void revokeShare({ organizationId, artifactId, shareId })
      .then(() => toast.success("Share link revoked."))
      .catch((error: unknown) =>
        showErrorToast(error, "Could not revoke the share link.")
      )
      .finally(() => setRevokingShareId(null))
  }

  if (status === "LoadingFirstPage") {
    return <ShareLinksSkeleton />
  }

  if (results.length === 0) {
    return (
      <Empty className="min-h-42 rounded-none border-t">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Link2 />
          </EmptyMedia>
          <EmptyTitle>No share links</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="min-h-42 divide-y border-t">
        {results.map((share) => (
          <ShareLinkRow
            active={share.expiresAt > now}
            disabled={revokingShareId !== null}
            isRevoking={revokingShareId === share.shareId}
            key={share.shareId}
            onRevoke={() => revoke(share.shareId)}
            share={share}
          />
        ))}
      </div>
      {status === "Exhausted" ? null : (
        <div className="flex justify-center border-t bg-muted/30 px-3 py-2">
          <Button
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(sharePageSize)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {status === "LoadingMore" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </>
  )
}

function ShareLinkRow({
  active,
  disabled,
  isRevoking,
  onRevoke,
  share,
}: {
  active: boolean
  disabled: boolean
  isRevoking: boolean
  onRevoke: () => void
  share: ShareLink
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <Link2 className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {active ? "Expires" : "Expired"} {absoluteTime(share.expiresAt)}
          </span>
          <Badge variant={active ? "secondary" : "outline"}>
            {active ? "Active" : "Expired"}
          </Badge>
        </div>
        <p className="truncate text-muted-foreground">
          Created {absoluteTime(share.createdAt)}
        </p>
      </div>
      {active ? (
        <Button
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled}
          onClick={onRevoke}
          size="sm"
          type="button"
          variant="ghost"
        >
          {isRevoking ? <Loader2 className="animate-spin" /> : null}
          Revoke
        </Button>
      ) : null}
    </div>
  )
}

function ShareLinksSkeleton() {
  return (
    <div className="min-h-42 divide-y border-t" role="status">
      {[0, 1, 2].map((row) => (
        <div className="flex min-h-14 items-center gap-3 px-4 py-2.5" key={row}>
          <Skeleton className="size-4 rounded-sm" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading share links</span>
    </div>
  )
}
