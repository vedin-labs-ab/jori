import { strToU8, zipSync } from "fflate"
import { expect, test } from "vitest"
import { extractText } from "./text"
import { bounded } from "./types"

test("decoded UTF16 keeps whitespace and offsets usable for later highlighting", () => {
  const text = "  Supplier\r\nGlacier åäö 🧊\n"
  const bytes = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, "utf16le"),
  ])
  expect(extractText(bytes, "report.txt", "text/plain")).toEqual([
    { text, label: "File content", start: 0, end: text.length },
  ])
})

test("office extraction retains notes and cells without arbitrary embedded files", () => {
  const doc = zipSync({
    "word/document.xml": strToU8(
      "<w:p>Customer &amp; supplier<script>hidden()</script\n data-x>\n<style>p{}</style >\n</w:p>"
    ),
    "word/footnotes.xml": strToU8("<w:p>Exception INV-98</w:p>"),
    "word/embeddings/secret.txt": strToU8("Never extracted"),
  })
  expect(
    extractText(doc, "report.docx", "application/octet-stream")
      .map((s) => s.text)
      .join("\n")
  ).toBe("Customer & supplier\nException INV-98")
  const xlsx = zipSync({
    "xl/sharedStrings.xml": strToU8(
      "<sst><si><t>Unused</t></si><si><t>Supplier Glacier</t></si></sst>"
    ),
    "xl/worksheets/sheet3.xml": strToU8(
      '<worksheet><row r="87"><c r="A87" t="s"><v>1</v></c><c r="B87"><v>9001</v></c></row></worksheet>'
    ),
  })
  expect(
    extractText(xlsx, "customers.xlsx", "application/octet-stream")
  ).toEqual([
    {
      text: "A87: Supplier Glacier\nB87: 9001",
      label: "Sheet 3, A87",
      sheet: "3",
      cell: "A87",
    },
  ])
})

test("slide and OpenDocument text preserve a usable source section", () => {
  const ppt = zipSync({
    "ppt/slides/slide12.xml": strToU8("<a:t>Invoice reconciliation</a:t>"),
    "ppt/notesSlides/notesSlide12.xml": strToU8("<a:t>Speaker note</a:t>"),
  })
  expect(extractText(ppt, "deck.pptx", "")).toContainEqual({
    text: "Invoice reconciliation",
    label: "Slide 12",
    page: 12,
  })
  const odt = zipSync({
    "content.xml": strToU8("<text:p>Quarterly review</text:p>"),
  })
  expect(extractText(odt, "report.odt", "")[0].text).toBe("Quarterly review")
})

test("RTF suppresses hidden destinations while retaining Unicode and paragraphs", () => {
  const text = String.raw`{\rtf1\ansi{\fonttbl Secret font;}Invoice \u229?\par Total 42}`
  expect(extractText(strToU8(text), "invoice.rtf", "")[0].text).toBe(
    "Invoice å\nTotal 42"
  )
})

test("binary masquerading as text and ZIP expansion attacks fail explicitly", () => {
  expect(() =>
    extractText(new Uint8Array([0xff]), "report.txt", "text/plain")
  ).toThrow("unsupported or damaged text encoding")
  const bomb = zipSync({
    "word/document.xml": strToU8("x".repeat(13 * 1024 * 1024)),
  })
  expect(() => extractText(bomb, "bomb.docx", "")).toThrow("expanded document")
})

test("large multilingual results preserve usable content and truthfully report truncation", () => {
  const text = "🧊冰".repeat(200_000)
  const result = bounded({
    sections: [{ text, start: 0, end: text.length }],
    coverage: "complete",
  })
  expect(result.coverage).toBe("partial")
  expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThan(
    601_000
  )
  expect(result.sections[0].end).toBe(result.sections[0].text.length)
  expect(result.sections[0].text.length).toBeGreaterThan(1000)
  expect(result.sections[0].text).not.toMatch(/[\uD800-\uDBFF]$/)
})
