import { TableCell, TableHead } from "@/components/ui/table"
import { VisibilityLabel, VisibilityMark } from "./badge"
import { type VisibilitySubject } from "./summary"

// The same container breakpoint owns both sides of the switch. There is
// exactly one audience presentation at every list width.
const audienceColumnClass = "@max-3xl/list:hidden"
const audienceMarkClass = "@3xl/list:hidden"

export function VisibilityNameMark(props: VisibilitySubject) {
  return <VisibilityMark className={audienceMarkClass} {...props} />
}

export function VisibilityHead() {
  return <TableHead className={audienceColumnClass}>Sharing</TableHead>
}

export function VisibilityCell(props: VisibilitySubject) {
  return (
    <TableCell className={audienceColumnClass}>
      <VisibilityLabel {...props} />
    </TableCell>
  )
}
