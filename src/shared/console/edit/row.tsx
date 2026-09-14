import { type ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { nameColumnClassName } from "../list/controls"
import { nameCellWidth } from "../materials/cells/name"
import { RowMenuTrigger } from "../menu"
import { ConsoleLink } from "../shell/link"
import { type ConsoleDestination } from "../shell/location"
import { ItemName } from "./name"
import { PendingItemName } from "./pending"
import { type Edit } from "./state"

export function CreatedItemRow({
  edit,
  children,
}: {
  edit: Edit
  children: ReactNode
}) {
  const { item, surface } = edit
  const destination: ConsoleDestination = {
    to: `/${item.kind}s/$${item.kind}Id`,
    params: { [`${item.kind}Id`]: item.id },
  }
  return (
    <TableRow>
      <TableCell className="w-8">
        <Checkbox disabled aria-label={`Select ${item.name}`} />
      </TableCell>
      <TableCell className={nameColumnClassName}>
        <div className={nameCellWidth}>
          {edit.creating ? (
            <PendingItemName item={item} />
          ) : (
            <ItemName item={item} surface={surface}>
              <ConsoleLink {...destination}>{item.name}</ConsoleLink>
            </ItemName>
          )}
        </div>
      </TableCell>
      {children}
      <TableCell className="text-right">
        <RowMenuTrigger name={item.name} disabled />
      </TableCell>
    </TableRow>
  )
}
