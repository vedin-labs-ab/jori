import { Folder } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"

export function PendingFolderName({ name }: { name: string }) {
  return (
    <div
      aria-busy="true"
      className="flex h-8 items-center gap-2 px-2 text-muted-foreground text-sm"
      role="status"
    >
      <Folder className="size-4 shrink-0" />
      <span className="shimmer truncate">{name}</span>
      <span className="sr-only">Creating folder.</span>
    </div>
  )
}

export function PendingFolderRow({
  name,
  colSpan,
}: {
  name: string
  colSpan: number
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <PendingFolderName name={name} />
      </TableCell>
    </TableRow>
  )
}
