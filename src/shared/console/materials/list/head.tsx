import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  columnTier,
  facetEntries,
  type ListConfig,
  type ListControls,
} from "../../list/controls"
import { FilterHead, SortHead } from "../../list/head"
import { type RowSelection } from "../../list/selection"
import { SelectionHeadCell } from "../../list/selection/bar"
import { type MaterialColumn } from "./types"

/** The header row is the page's control surface: the name always sorts,
 *  and every other column does what its head declares. */
export function MaterialListHead<Row>({
  columns,
  config,
  controls,
  selection,
}: {
  columns: readonly MaterialColumn<Row>[]
  config: ListConfig<Row>
  controls: ListControls
  selection: RowSelection<Row>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead controls={controls} label="Name" sortKey="name" />
        {columns.map((column) => (
          <ColumnHead
            column={column}
            config={config}
            controls={controls}
            key={column.label}
          />
        ))}
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  )
}

function ColumnHead<Row>({
  column,
  config,
  controls,
}: {
  column: MaterialColumn<Row>
  config: ListConfig<Row>
  controls: ListControls
}) {
  const className = columnTier[column.tier]

  if (column.head === undefined) {
    return <TableHead className={className}>{column.label}</TableHead>
  }

  if ("sortKey" in column.head) {
    return (
      <SortHead
        className={className}
        controls={controls}
        label={column.label}
        sortKey={column.head.sortKey}
      />
    )
  }

  return (
    <FilterHead
      className={className}
      controls={controls}
      facets={facetEntries(config, column.head.facets)}
      label={column.label}
    />
  )
}
