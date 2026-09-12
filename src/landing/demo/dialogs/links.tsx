import { MaterialLinksDialog } from "@/shared/console/materials/links"
import { useDemoShares, useShareActions } from "../shares"

export function DemoLinksDialog({
  kind,
  materialId,
  onOpenChange,
  open,
}: {
  kind: "table" | "store" | "file"
  materialId: string
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const shares = useDemoShares(materialId)
  const { onMint, onRevoke } = useShareActions(materialId, kind)

  return (
    <MaterialLinksDialog
      noun={kind}
      onMint={onMint}
      onOpenChange={onOpenChange}
      onRevoke={onRevoke}
      open={open}
      shares={shares}
    />
  )
}
