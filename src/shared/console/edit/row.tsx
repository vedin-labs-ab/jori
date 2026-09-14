import { TableCell, TableRow } from "@/components/ui/table"
import { ConsoleLink } from "../shell/link"
import { type ConsoleDestination } from "../shell/location"
import { editIcons } from "./icons"
import { ItemName } from "./name"
import { type Edit } from "./state"

export function CreatedItemRow({
  edit,
  colSpan,
}: {
  edit: Edit
  colSpan: number
}) {
  const { item, surface } = edit
  const Icon = editIcons[item.kind]
  const destination: ConsoleDestination = {
    to: `/${item.kind}s/$${item.kind}Id`,
    params: { [`${item.kind}Id`]: item.id },
  }
  return (
    <TableRow>
      <TableCell />
      <TableCell colSpan={colSpan - 1}>
        <div className="max-w-64">
          {edit.creating ? (
            <div
              aria-busy="true"
              role="status"
              className="flex h-8 items-center gap-2 text-muted-foreground text-sm"
            >
              <Icon className="size-4 shrink-0" />
              <span className="shimmer truncate">{item.name}</span>
              <span className="sr-only">Creating {item.kind}.</span>
            </div>
          ) : (
            <ItemName item={item} surface={surface}>
              <ConsoleLink {...destination}>{item.name}</ConsoleLink>
            </ItemName>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
