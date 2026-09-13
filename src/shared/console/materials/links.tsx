import { shareExpiry } from "@contracts/shares/expiry"
import { Link2, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { CopyableCodeBlock } from "../copy"
import { showErrorToast } from "../error"
import { ShareHistory, type SharePages, type ShareRow } from "./history"

export type MintedLink = { url: string; urlPath: string; expiresAt: number }

const expiryOptions = [
  { hours: 24, label: "1 day" },
  { hours: shareExpiry.defaultHours, label: "3 days" },
  { hours: shareExpiry.maxHours, label: "7 days" },
]

/** Share-link management every material detail view reuses: mint with an
 *  expiry, copy the fresh link, and see or revoke earlier ones. The domain
 *  binding supplies the Convex functions; this stays presentation-only. */
export function MaterialLinksDialog<Share extends ShareRow>({
  noun,
  onMint,
  onOpenChange,
  onRevoke,
  open,
  shares,
}: {
  noun: string
  onMint: (expiresInHours: number) => Promise<MintedLink>
  onOpenChange: (open: boolean) => void
  onRevoke: (share: Share) => Promise<unknown>
  open: boolean
  shares: SharePages<Share>
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent bodyClassName="gap-0 p-0" className="sm:max-w-md">
        <DialogHeader className="p-4 pr-10">
          <DialogTitle>Share links</DialogTitle>
          <DialogDescription>
            Anyone with a link can view this {noun} until the link expires or is
            revoked.
          </DialogDescription>
        </DialogHeader>
        <MaterialLinks onMint={onMint} onRevoke={onRevoke} shares={shares} />
      </DialogContent>
    </Dialog>
  )
}

/** The dialog's body on its own — minting, then the links so far — for a
 *  page that shows the links in place rather than behind a dialog. */
export function MaterialLinks<Share extends ShareRow>({
  onMint,
  onRevoke,
  shares,
}: {
  onMint: (expiresInHours: number) => Promise<MintedLink>
  onRevoke: (share: Share) => Promise<unknown>
  shares: SharePages<Share>
}) {
  return (
    <>
      <MintRow onMint={onMint} />
      <ShareHistory onRevoke={onRevoke} shares={shares} />
    </>
  )
}

function MintRow({
  onMint,
}: {
  onMint: (expiresInHours: number) => Promise<MintedLink>
}) {
  const [hours, setHours] = useState<number>(shareExpiry.defaultHours)
  const [isMinting, setIsMinting] = useState(false)
  const [mintedUrl, setMintedUrl] = useState<string>()
  const mint = () => {
    setIsMinting(true)
    void onMint(hours)
      .then((minted) => {
        setMintedUrl(absoluteShareUrl(minted))
        toast.success("Share link created.")
      })
      .catch((error: unknown) =>
        showErrorToast(error, "Could not create a share link.")
      )
      .finally(() => setIsMinting(false))
  }

  return (
    <div className="grid gap-3 border-t p-4">
      <div className="flex items-center gap-2">
        <Select
          onValueChange={(value) => setHours(Number(value))}
          value={String(hours)}
        >
          <SelectTrigger aria-label="Link expiry" className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {expiryOptions.map((option) => (
              <SelectItem key={option.hours} value={String(option.hours)}>
                Expires in {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={isMinting} onClick={mint} type="button">
          {isMinting ? <Loader2 className="animate-spin" /> : <Link2 />}
          Create link
        </Button>
      </div>
      {mintedUrl === undefined ? null : (
        <CopyableCodeBlock
          contentClassName="break-all"
          label="share link"
          value={mintedUrl}
        />
      )}
    </div>
  )
}

/** Convex mints relative paths when no public origin is configured; the
 *  console can always complete them from its own origin. */
function absoluteShareUrl(minted: MintedLink) {
  if (minted.url !== minted.urlPath) {
    return minted.url
  }

  return new URL(minted.urlPath, window.location.origin).toString()
}
