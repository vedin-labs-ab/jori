import { type ReactNode } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { nameCellWidth } from "../materials/cells/name"
import { RowMenuTrigger } from "../menu"
import { ConsoleLink } from "../shell/link"
import { type ConsoleDestination } from "../shell/location"
import { editIcons } from "./icons"
import { ItemName } from "./name"
import { type Edit } from "./state"

export function CreatedItemRow({
  edit,
  children,
}: {
  edit: Edit
  children: ReactNode
}) {
  const { item, surface } = edit
  const Icon = editIcons[item.kind]
  const destination: ConsoleDestination = {
    to: `/${item.kind}s/$${item.kind}Id`,
    params: { [`${item.kind}Id`]: item.id },
  }
  return (
    <TableRow>
      <TableCell className="w-8">
        <Checkbox disabled aria-label={`Select ${item.name}`} />
      </TableCell>
      <TableCell>
        <div className={nameCellWidth}>
          {edit.creating ? (
            <div
              aria-busy="true"
              role="status"
              className="flex h-6 items-center gap-2 text-muted-foreground text-sm"
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
      {children}
      <TableCell className="text-right">
        <RowMenuTrigger name={item.name} disabled />
      </TableCell>
    </TableRow>
  )
}
