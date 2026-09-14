import { TableCell, TableHead } from "@/components/ui/table"
import { VisibilityLabel, VisibilityMark } from "./badge"
import { type VisibilitySubject } from "./summary"

// The same container breakpoint owns both sides of the switch. There is
// exactly one audience presentation at every list width.
const audienceColumnClass = "@max-3xl/list:hidden"
const audienceMarkClass = "@3xl/list:hidden"

export function VisibilityNameMark(props: VisibilitySubject) {
  if (props.visibility.mode === "organization") {
    return null
  }
  return <VisibilityMark className={audienceMarkClass} {...props} />
}

export function VisibilityHead() {
  return <TableHead className={audienceColumnClass}>Audience</TableHead>
}

export function VisibilityCell(props: VisibilitySubject) {
  return (
    <TableCell className={audienceColumnClass}>
      <VisibilityLabel quietDefault {...props} />
    </TableCell>
  )
}
