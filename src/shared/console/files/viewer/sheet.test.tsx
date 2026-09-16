// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { strToU8, zipSync } from "fflate"
import { afterEach, expect, test, vi } from "vitest"
import { rowLimit, SheetView } from "./sheet"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const main = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'

/** A two-sheet workbook: a small forecast, and a long list past the row
 *  limit. */
function workbook(rows = 3) {
  const cells = (row: number) =>
    `<row r="${row}"><c r="A${row}" t="inlineStr"><is><t>Row ${row}</t></is></c><c r="B${row}"><v>${row * 1000.5}</v></c></row>`

  return zipSync({
    "xl/workbook.xml": strToU8(
      `<workbook ${main} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Forecast" sheetId="1" r:id="rId1"/><sheet name="Costs" sheetId="2" r:id="rId2"/></sheets></workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="w" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="w" Target="worksheets/sheet2.xml"/></Relationships>'
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<worksheet ${main}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Month</t></is></c><c r="B1" t="inlineStr"><is><t>Net MRR</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>July</t></is></c><c r="B2"><v>21500</v></c></row></sheetData></worksheet>`
    ),
    "xl/worksheets/sheet2.xml": strToU8(
      `<worksheet ${main}><sheetData>${Array.from({ length: rows }, (_, index) => cells(index + 1)).join("")}</sheetData></worksheet>`
    ),
  })
}

function renderSheet(bytes: Uint8Array, status = 200) {
  const onError = vi.fn()
  const onReady = vi.fn()

  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(new Uint8Array(bytes), { status }))
    )
  )
  render(
    <SheetView
      name="forecast.xlsx"
      onError={onError}
      onReady={onReady}
      url="https://files.test/forecast.xlsx"
    />
  )

  return { onError, onReady }
}

/** Radix tabs switch on pointer down, not on click alone. */
function pickTab(name: string) {
  const tab = screen.getByRole("tab", { name })

  fireEvent.mouseDown(tab)
  fireEvent.click(tab)
}

test("the first sheet opens as a grid with letters across and numbers down", async () => {
  const { onReady } = renderSheet(workbook())

  const table = await screen.findByRole("table", { name: "forecast.xlsx" })

  expect(onReady).toHaveBeenCalledOnce()
  expect(
    screen.getAllByRole("columnheader").map((cell) => cell.textContent)
  ).toEqual(["Row", "A", "B"])
  expect(
    screen.getAllByRole("rowheader").map((cell) => cell.textContent)
  ).toEqual(["1", "2"])
  expect(table.textContent).toContain("Net MRR")
  expect(screen.getByText("21500").closest("td")?.className).toContain(
    "text-right"
  )
  expect(screen.getByText("July").closest("td")?.className).not.toContain(
    "text-right"
  )
})

test("the sheet tabs switch sheets, and a long sheet says where it stops", async () => {
  renderSheet(workbook(rowLimit + 5))

  await screen.findByRole("table")

  expect(screen.getByRole("tab", { name: "Forecast" }).dataset.state).toBe(
    "active"
  )

  pickTab("Costs")

  expect(screen.getByText("Row 1")).toBeDefined()
  expect(screen.getByText(`Row ${rowLimit}`)).toBeDefined()
  expect(screen.queryByText(`Row ${rowLimit + 1}`)).toBeNull()
  expect(
    screen.getByText(`First ${rowLimit} of ${rowLimit + 5} rows`)
  ).toBeDefined()
})

test("bytes that will not read as a workbook report an error", async () => {
  const { onError, onReady } = renderSheet(strToU8("not a zip"))

  await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())

  expect(onReady).not.toHaveBeenCalled()
  expect(screen.queryByRole("table")).toBeNull()
})
