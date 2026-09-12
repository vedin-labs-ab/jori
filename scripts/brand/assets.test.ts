import { readFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"

const directory = path.resolve("public/brand")

async function pixels(file: string) {
  return await sharp(path.join(directory, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

function pixel(
  image: Awaited<ReturnType<typeof pixels>>,
  x: number,
  y: number
) {
  const offset = (y * image.info.width + x) * 4
  return [...image.data.subarray(offset, offset + 4)]
}

describe("published brand artwork", () => {
  it.each([512, 1024])(
    "keeps %ipx marks tight, transparent outside, and opaque inside",
    async (size) => {
      for (const theme of ["light", "dark"] as const) {
        const image = await pixels(`mark/mark-${theme}-${size}.png`)
        const body = theme === "light" ? 0 : 255
        const slit = 255 - body
        const center = size / 2
        expect(pixel(image, 0, 0)[3]).toBe(0)
        expect(pixel(image, center, 0)).toEqual([body, body, body, 255])
        expect(pixel(image, 0, center)).toEqual([body, body, body, 255])
        expect(pixel(image, center, center)).toEqual([body, body, body, 255])
        expect(pixel(image, center, Math.round((size * 36) / 52))).toEqual([
          slit,
          slit,
          slit,
          255,
        ])
      }
    }
  )

  it("keeps the slit opaque even at the 16px browser size", async () => {
    const image = await pixels("favicon/favicon-16.png")
    expect(pixel(image, 0, 0)[3]).toBe(0)
    expect(pixel(image, 8, 11)).toEqual([255, 255, 255, 255])
  })

  it("uses an opaque launcher and keeps the slit inside every safe mask", async () => {
    const image = await pixels("favicon/maskable-512.png")
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const [red, , , alpha] = pixel(image, x, y)
        if (alpha !== 255) {
          throw new Error(`Transparent launcher pixel at ${x}, ${y}`)
        }
        if (red > 0) {
          expect(Math.hypot(x + 0.5 - 256, y + 0.5 - 256)).toBeLessThan(204.8)
        }
      }
    }
  })

  it("declares real ICO frames and keeps the root fallback identical", async () => {
    const ico = await readFile(path.join(directory, "favicon/favicon.ico"))
    expect(await readFile(path.resolve("public/favicon.ico"))).toEqual(ico)
    expect(ico.readUInt16LE(4)).toBe(3)
    for (const [index, size] of [16, 32, 48].entries()) {
      const entry = 6 + index * 16
      const length = ico.readUInt32LE(entry + 8)
      const offset = ico.readUInt32LE(entry + 12)
      const raster = await sharp(
        ico.subarray(offset, offset + length)
      ).metadata()
      expect([raster.width, raster.height]).toEqual([size, size])
    }
  })
})
