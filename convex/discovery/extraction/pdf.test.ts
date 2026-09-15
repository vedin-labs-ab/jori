// @vitest-environment node
import { expect, test } from "vitest"
import { extractPdf } from "./pdf"

function document(image: boolean) {
  const command = `BT /F1 12 Tf 10 100 Td (Invoice INV-2026) Tj ET${image ? " /Im1 Do" : ""}`
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${command.length} >>\nstream\n${command}\nendstream`,
    "<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\naaa\nendstream",
  ]
  let text = "%PDF-1.4\n"
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(text.length)
    text += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const offset = text.length
  text += `xref\n0 7\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`
  return new TextEncoder().encode(text)
}

test("selectable PDF pages preserve page anchors without OCR", async () => {
  const result = await extractPdf(document(false))
  expect(result.recognition).toEqual([])
  expect(result.sections[0]).toMatchObject({
    text: "Invoice INV-2026",
    page: 1,
    start: 0,
    end: 16,
  })
  expect(result.partial).toBe(false)
})

test("mixed text and image pages retain text and request OCR for that page", async () => {
  const result = await extractPdf(document(true))
  expect(result.recognition).toEqual([1])
  expect(result.sections[0].text).toBe("Invoice INV-2026")
})
