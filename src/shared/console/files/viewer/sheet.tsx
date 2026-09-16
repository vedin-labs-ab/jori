import { useEffect, useEffectEvent, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  type Sheet,
  type SheetCell,
  type Workbook,
} from "@/shared/files/workbook"

/** Rows past this stay in the file, and a band under the table says so. A
 *  workbook can run to a million rows; a preview is for reading. */
export const rowLimit = 500

/** A workbook read in place: one sheet at a time as a read-only grid in
 *  the spreadsheet's own frame of reference — column letters across the
 *  top, row numbers down the side, numbers right-aligned — with the
 *  sheets as tabs when there is more than one. The reader loads on first
 *  use so it never rides in the page's bundle. */
export function SheetView({
  name,
  onError,
  onReady,
  url,
}: {
  name: string
  onError: () => void
  onReady: () => void
  url: string
}) {
  const [workbook, setWorkbook] = useState<Workbook>()
  const [active, setActive] = useState(0)
  const settle = useEffectEvent((loaded: Workbook | undefined) => {
    if (loaded === undefined) {
      onError()
    } else {
      setWorkbook(loaded)
      onReady()
    }
  })

  useEffect(() => {
    let isMounted = true

    void loadWorkbook(url)
      .catch(() => undefined)
      .then((loaded) => {
        if (isMounted) {
          settle(loaded)
        }
      })

    return () => {
      isMounted = false
    }
  }, [url])

  if (workbook === undefined) {
    return null
  }

  const sheet = workbook.sheets[active]

  return (
    <div className="flex size-full flex-col">
      {workbook.sheets.length > 1 ? (
        <SheetTabs active={active} onChange={setActive} workbook={workbook} />
      ) : null}
      {sheet === undefined ? (
        <Notice>This workbook has no sheets.</Notice>
      ) : (
        <SheetTable name={name} sheet={sheet} />
      )}
    </div>
  )
}

async function loadWorkbook(url: string) {
  const [response, { parseWorkbook }] = await Promise.all([
    fetch(url),
    import("@/shared/files/workbook"),
  ])

  if (!response.ok) {
    throw new Error(`Fetching the file failed (${response.status}).`)
  }

  return parseWorkbook(new Uint8Array(await response.arrayBuffer()))
}

function SheetTabs({
  active,
  onChange,
  workbook,
}: {
  active: number
  onChange: (index: number) => void
  workbook: Workbook
}) {
  return (
    <Tabs
      className="shrink-0 overflow-x-auto border-b bg-background"
      onValueChange={(value) => onChange(Number(value))}
      value={String(active)}
    >
      <TabsList aria-label="Sheets" className="h-9 px-2" variant="line">
        {workbook.sheets.map((sheet, index) => (
          <TabsTrigger key={sheet.name} value={String(index)}>
            {sheet.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** The sheet's cells, the header row and the number gutter staying put
 *  while the rest scrolls under them. Hairlines ride on the cells so they
 *  end where the data ends, the way the tables grid draws them. */
function SheetTable({ name, sheet }: { name: string; sheet: Sheet }) {
  const rows = sheet.rows.slice(0, rowLimit)
  const width = rows[0]?.length ?? 0

  if (rows.length === 0 || width === 0) {
    return <Notice>This sheet is empty.</Notice>
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table
        aria-label={name}
        className="w-max border-separate border-spacing-0 text-xs"
      >
        <thead>
          <tr>
            <th
              className={cn(gutterClass, "sticky top-0 left-0 z-20")}
              scope="col"
            >
              <span className="sr-only">Row</span>
            </th>
            {Array.from({ length: width }, (_, column) => (
              <th
                className="sticky top-0 z-10 h-9 min-w-24 border-r border-b bg-background px-3 text-center font-medium text-muted-foreground"
                key={columnLabel(column)}
                scope="col"
              >
                {columnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their position, and the sheet never reorders.
            <tr className="hover:bg-muted/50" key={index}>
              <th className={cn(gutterClass, "sticky left-0 z-10")} scope="row">
                {index + 1}
              </th>
              {cells.map((cell, column) => (
                <Cell cell={cell} key={columnLabel(column)} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sheet.rows.length > rowLimit ? (
        <p className="flex h-9 w-fit items-center whitespace-nowrap border-r border-b px-3 text-muted-foreground text-xs">
          First {rowLimit} of {sheet.rows.length} rows
        </p>
      ) : null}
    </div>
  )
}

const gutterClass =
  "h-9 w-12 border-r border-b bg-background px-2 text-center font-normal text-muted-foreground tabular-nums"

function Cell({ cell }: { cell: SheetCell }) {
  const isNumber = typeof cell === "number"

  return (
    <td
      className={cn(
        "h-9 border-r border-b px-3",
        isNumber && "text-right tabular-nums"
      )}
    >
      <span className="block max-w-80 truncate">
        {isNumber ? formatNumber(cell) : cell}
      </span>
    </td>
  )
}

/** The number as Excel's General format shows it: no grouping, and the
 *  binary noise past fifteen significant digits trimmed away. */
function formatNumber(value: number) {
  return String(Number(value.toPrecision(15)))
}

/** 0 → A, 25 → Z, 26 → AA. */
function columnLabel(index: number) {
  let label = ""

  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    label = String.fromCharCode(64 + ((rest - 1) % 26) + 1) + label
  }

  return label
}

function Notice({ children }: { children: string }) {
  return (
    <div className="grid flex-1 place-content-center text-muted-foreground text-sm">
      {children}
    </div>
  )
}
