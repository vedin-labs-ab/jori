// @vitest-environment jsdom
import { strToU8, zipSync } from "fflate"
import { expect, test } from "vitest"
import { parseWorkbook } from "./workbook"

const main = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
const rels =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

/** A workbook zipped from the parts a test cares about; the rest is the
 *  minimum a writer would emit. */
function workbook(parts: Record<string, string>, sheets = ["Sheet1"]) {
  return zipSync(
    Object.fromEntries(
      Object.entries({
        "xl/workbook.xml": `<workbook ${main} ${rels}><sheets>${sheets
          .map(
            (name, index) =>
              `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
          )
          .join("")}</sheets></workbook>`,
        "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
          .map(
            (_, index) =>
              `<Relationship Id="rId${index + 1}" Type="w" Target="worksheets/sheet${index + 1}.xml"/>`
          )
          .join("")}</Relationships>`,
        ...parts,
      }).map(([path, xml]) => [path, strToU8(xml)])
    )
  )
}

function sheet(rows: string) {
  return `<worksheet ${main}><sheetData>${rows}</sheetData></worksheet>`
}

test("reads shared, inline, numeric, boolean, and formula cells into one grid", () => {
  const parsed = parseWorkbook(
    workbook({
      "xl/sharedStrings.xml": `<sst ${main}><si><t>Month</t></si><si><r><t>Net </t></r><r><t>MRR</t></r><rPh><t>ignored</t></rPh></si></sst>`,
      "xl/worksheets/sheet1.xml": sheet(
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>Paid</t></is></c></row>' +
          '<row r="2"><c r="A2" t="str"><f>TEXT(1)</f><v>July</v></c><c r="B2"><f>SUM(1)</f><v>21500.5</v></c><c r="C2" t="b"><v>1</v></c></row>'
      ),
    })
  )

  expect(parsed.sheets).toEqual([
    {
      name: "Sheet1",
      rows: [
        ["Month", "Net MRR", "Paid"],
        ["July", 21500.5, "TRUE"],
      ],
    },
  ])
})

test("gaps stay in place: skipped rows and cells read as empty, rows pad to one width", () => {
  const parsed = parseWorkbook(
    workbook({
      "xl/worksheets/sheet1.xml": sheet(
        '<row r="1"><c r="C1"><v>3</v></c></row><row r="3"><c r="A3"><v>1</v></c><c r="AA3"><v>27</v></c></row>'
      ),
    })
  )

  const rows = parsed.sheets[0]?.rows ?? []

  expect(rows).toHaveLength(3)
  expect(rows[0]?.slice(0, 4)).toEqual([null, null, 3, null])
  expect(rows[1]).toEqual(Array.from({ length: 27 }, () => null))
  expect(rows[2]?.[0]).toBe(1)
  expect(rows[2]?.[26]).toBe(27)
})

test("numbers styled as dates read as dates; the rest stay numbers", () => {
  const parsed = parseWorkbook(
    workbook({
      "xl/styles.xml": `<styleSheet ${main}><numFmts><numFmt numFmtId="164" formatCode="[Red]&quot;Day&quot; yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="#,##0.00 &quot;months&quot;"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="20"/></cellXfs></styleSheet>`,
      "xl/worksheets/sheet1.xml": sheet(
        '<row r="1"><c r="A1" s="1"><v>45901</v></c><c r="B1" s="2"><v>45901.5</v></c><c r="C1" s="3"><v>45901</v></c><c r="D1" s="4"><v>0.75</v></c><c r="E1" s="0"><v>45901</v></c></row>'
      ),
    })
  )

  expect(parsed.sheets[0]?.rows[0]).toEqual([
    "2025-09-01",
    "2025-09-01 12:00",
    45901,
    "18:00",
    45901,
  ])
})

test("sheets keep the workbook's order and names; hidden ones stay out", () => {
  const parsed = parseWorkbook(
    zipSync({
      "xl/workbook.xml": strToU8(
        `<workbook ${main} ${rels}><sheets><sheet name="Costs" sheetId="2" r:id="rId2"/><sheet name="Scratch" sheetId="3" state="hidden" r:id="rId3"/><sheet name="Revenue" sheetId="1" r:id="rId1"/></sheets></workbook>`
      ),
      "xl/_rels/workbook.xml.rels": strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="w" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="rId2" Type="w" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="w" Target="worksheets/sheet3.xml"/></Relationships>'
      ),
      "xl/worksheets/sheet1.xml": strToU8(sheet("")),
      "xl/worksheets/sheet2.xml": strToU8(
        sheet('<row r="1"><c r="A1"><v>1</v></c></row>')
      ),
      "xl/worksheets/sheet3.xml": strToU8(sheet("")),
    })
  )

  expect(parsed.sheets.map((entry) => entry.name)).toEqual(["Costs", "Revenue"])
  expect(parsed.sheets[1]?.rows).toEqual([])
})

test("bytes that are not a workbook are refused", () => {
  expect(() =>
    parseWorkbook(zipSync({ "readme.txt": strToU8("hello") }))
  ).toThrow("Not a workbook.")
  expect(() => parseWorkbook(strToU8("plain text"))).toThrow()
})
