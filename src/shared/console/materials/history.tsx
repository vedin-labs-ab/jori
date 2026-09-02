import { Link2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { showErrorToast } from "../error"
import { absoluteTime, useNow } from "../time"

export const sharePageSize = 8

export type ShareRow = { shareId: string; createdAt: number; expiresAt: number }
export type ShareStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted"

export type SharePages<Share extends ShareRow> = {
  loadMore: (count: number) => void
  results: Share[]
  status: ShareStatus
}

/** The active and expired links of one material: active ones can be
 *  revoked, expired ones remain as history. */
export function ShareHistory<Share extends ShareRow>({
  onRevoke,
  shares,
}: {
  onRevoke: (share: Share) => Promise<unknown>
  shares: SharePages<Share>
}) {
  const now = useNow(30_000)
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null)
  const revoke = (share: Share) => {
    setRevokingShareId(share.shareId)
    void onRevoke(share)
      .then(() => toast.success("Share link revoked."))
      .catch((error: unknown) =>
        showErrorToast(error, "Could not revoke the share link.")
      )
      .finally(() => setRevokingShareId(null))
  }

  if (shares.status === "LoadingFirstPage") {
    return <ShareHistorySkeleton />
  }

  if (shares.results.length === 0) {
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
        {shares.results.map((share) => (
          <ShareHistoryRow
            active={share.expiresAt > now}
            disabled={revokingShareId !== null}
            isRevoking={revokingShareId === share.shareId}
            key={share.shareId}
            onRevoke={() => revoke(share)}
            share={share}
          />
        ))}
      </div>
      {shares.status === "Exhausted" ? null : (
        <div className="flex justify-center border-t bg-muted/30 px-3 py-2">
          <Button
            disabled={shares.status === "LoadingMore"}
            onClick={() => shares.loadMore(sharePageSize)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {shares.status === "LoadingMore" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </>
  )
}

function ShareHistoryRow({
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
  share: ShareRow
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2 text-sm">
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
        <p className="truncate text-muted-foreground text-xs">
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

function ShareHistorySkeleton() {
  return (
    <div className="min-h-42 divide-y border-t" role="status">
      {[0, 1, 2].map((row) => (
        <div className="flex min-h-12 items-center gap-3 px-4 py-2" key={row}>
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
