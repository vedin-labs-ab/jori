import { strFromU8, unzipSync } from "fflate"

// A reader for Office Open XML workbooks — the zip of XML parts an .xlsx
// is — just deep enough to show what a sheet holds: the sheets in order,
// each cell's stored value, dates told apart from plain numbers by the
// cell's number format. Formulas contribute their cached result; styling,
// merges, and charts are not the preview's concern.

/** A cell as the sheet view shows it: numbers keep their type so the view
 *  can align them, everything else is text, and an empty cell is null. */
export type SheetCell = number | string | null

export type Sheet = {
  name: string
  /** Rectangular: every row carries the sheet's full column count. */
  rows: SheetCell[][]
}

export type Workbook = {
  sheets: Sheet[]
}

const relationships =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

/** The workbook behind the bytes. Throws when they are not one. */
export function parseWorkbook(bytes: Uint8Array): Workbook {
  const parts = unzipSync(bytes)
  const workbook = part(parts, "xl/workbook.xml")

  if (workbook === undefined) {
    throw new Error("Not a workbook.")
  }

  const targets = relationshipTargets(part(parts, "xl/_rels/workbook.xml.rels"))
  const strings = sharedStrings(part(parts, "xl/sharedStrings.xml"))
  const dateStyles = dateStyleIndexes(part(parts, "xl/styles.xml"))
  const epoch = isDate1904(workbook) ? 24107 : 25569
  const readCell = (cell: Element) =>
    cellValue(cell, { dateStyles, epoch, strings })

  return {
    sheets: elements(workbook, "sheet")
      .filter(
        (sheet) => (sheet.getAttribute("state") ?? "visible") === "visible"
      )
      .flatMap((sheet) => {
        const document = part(
          parts,
          targets.get(sheet.getAttributeNS(relationships, "id") ?? "") ?? ""
        )

        return document === undefined
          ? []
          : [
              {
                name: sheet.getAttribute("name") ?? "Sheet",
                rows: sheetRows(document, readCell),
              },
            ]
      }),
  }
}

function part(parts: Record<string, Uint8Array>, path: string) {
  const bytes = parts[path]

  return bytes === undefined
    ? undefined
    : new DOMParser().parseFromString(strFromU8(bytes), "application/xml")
}

function elements(scope: Document | Element, localName: string) {
  return Array.from(scope.getElementsByTagNameNS("*", localName))
}

/** Relationship id to the part it names, as a path inside the zip. */
function relationshipTargets(rels: Document | undefined) {
  const targets = new Map<string, string>()

  for (const relationship of rels === undefined
    ? []
    : elements(rels, "Relationship")) {
    const target = relationship.getAttribute("Target") ?? ""

    targets.set(
      relationship.getAttribute("Id") ?? "",
      target.startsWith("/") ? target.slice(1) : `xl/${target}`
    )
  }

  return targets
}

/** The shared string table, each entry's runs joined and its phonetic
 *  guides left out. */
function sharedStrings(document: Document | undefined) {
  return document === undefined
    ? []
    : elements(document, "si").map((item) => runText(item))
}

function runText(scope: Element) {
  return elements(scope, "t")
    .filter((text) => text.parentElement?.localName !== "rPh")
    .map((text) => text.textContent)
    .join("")
}

/** Built-in number formats that render as dates or times. */
const builtinDateFormats = new Set([
  ...range(14, 22),
  ...range(27, 36),
  ...range(45, 47),
  ...range(50, 58),
])

/** Which cell style indexes format their number as a date: the built-in
 *  date formats, and custom codes that spell out date or time parts once
 *  literals, colors, and escapes are set aside. */
function dateStyleIndexes(styles: Document | undefined) {
  if (styles === undefined) {
    return new Set<number>()
  }

  const customDates = new Set(
    elements(styles, "numFmt")
      .filter((format) =>
        /[dmyhs]/i.test(
          (format.getAttribute("formatCode") ?? "").replace(
            /"[^"]*"|\[[^\]]*\]|\\./g,
            ""
          )
        )
      )
      .map((format) => Number(format.getAttribute("numFmtId")))
  )
  const cellStyles = elements(styles, "cellXfs")[0]

  return new Set(
    (cellStyles === undefined ? [] : elements(cellStyles, "xf")).flatMap(
      (style, index) => {
        const formatId = Number(style.getAttribute("numFmtId") ?? "0")

        return builtinDateFormats.has(formatId) || customDates.has(formatId)
          ? [index]
          : []
      }
    )
  )
}

function isDate1904(workbook: Document) {
  return ["1", "true"].includes(
    elements(workbook, "workbookPr")[0]?.getAttribute("date1904") ?? ""
  )
}

/** The sheet's rows in Excel's numbering, gaps included, padded to one
 *  column count. */
function sheetRows(
  document: Document,
  readCell: (cell: Element) => SheetCell
): SheetCell[][] {
  const rows: SheetCell[][] = []
  let width = 0

  for (const row of elements(document, "row")) {
    const rowIndex = Number(row.getAttribute("r") ?? rows.length + 1) - 1
    const cells: SheetCell[] = []

    for (const cell of elements(row, "c")) {
      const reference = cell.getAttribute("r")
      const column = reference === null ? cells.length : columnIndex(reference)

      cells[column] = readCell(cell)
    }

    rows[rowIndex] = Array.from(cells, (cell) => cell ?? null)
    width = Math.max(width, cells.length)
  }

  return Array.from({ length: rows.length }, (_, index) => {
    const cells = rows[index] ?? []

    return Array.from({ length: width }, (_, column) => cells[column] ?? null)
  })
}

/** "AB7" → 27: the column letters as a zero-based index. */
function columnIndex(reference: string) {
  let index = 0

  for (const letter of reference.replace(/[^A-Z]/g, "")) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }

  return index - 1
}

function cellValue(
  cell: Element,
  context: { dateStyles: Set<number>; epoch: number; strings: string[] }
): SheetCell {
  const type = cell.getAttribute("t") ?? "n"
  const value = elements(cell, "v")[0]?.textContent ?? ""

  switch (type) {
    case "inlineStr":
      return runText(cell)
    case "s":
      return context.strings[Number(value)] ?? ""
    case "b":
      return value === "1" ? "TRUE" : "FALSE"
    case "str":
    case "e":
    case "d":
      return value
    default: {
      if (value === "") {
        return null
      }

      const number = Number(value)
      const style = Number(cell.getAttribute("s") ?? "-1")

      return context.dateStyles.has(style)
        ? formatSerialDate(number, context.epoch)
        : number
    }
  }
}

/** A date serial as a plain ISO-style string: the date, and the time of
 *  day when the serial carries one; a bare time when it carries only that. */
function formatSerialDate(serial: number, epoch: number) {
  const date = new Date(Math.round((serial - epoch) * 86_400_000))
  const day = date.toISOString().slice(0, 10)
  const time = date.toISOString().slice(11, 16)

  if (serial < 1) {
    return time
  }

  return Number.isInteger(serial) ? day : `${day} ${time}`
}

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, offset) => from + offset)
}
