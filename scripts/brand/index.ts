import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { type BrandTheme } from "../../src/shared/brand/geometry.ts"
import { iconFile } from "./ico.ts"
import {
  avatarSvg,
  faviconSvg,
  launcherSvg,
  lockupSvg,
  markSvg,
} from "./vector.ts"

const root = path.resolve("public/brand")
for (const directory of ["mark", "wordmark", "avatar", "favicon"]) {
  await mkdir(path.join(root, directory), { recursive: true })
}
for (const theme of ["light", "dark"] as const) {
  await exportTheme(theme)
}
await exportIcons()
process.stdout.write(
  "Brand SVGs, transparent PNGs, avatars and icons rebuilt.\n"
)

async function exportTheme(theme: BrandTheme) {
  const mark = markSvg(theme)
  const lockup = lockupSvg(theme)
  await writeFile(path.join(root, `mark/mark-${theme}.svg`), mark)
  await writeFile(path.join(root, `wordmark/wordmark-${theme}.svg`), lockup)
  for (const size of [512, 1024]) {
    await png(mark, size, `mark/mark-${theme}-${size}.png`)
  }
  await png(lockup, 256, `wordmark/wordmark-${theme}.png`)
  await png(avatarSvg(theme), 512, `avatar/avatar-${theme}-512.png`)
}

async function exportIcons() {
  await writeFile(path.join(root, "favicon/favicon.svg"), faviconSvg(true))
  const frames = []
  for (const size of [16, 32, 48, 96]) {
    const raster = await png(faviconSvg(), size, `favicon/favicon-${size}.png`)
    if (size <= 48) {
      frames.push({ size, png: raster })
    }
  }
  const ico = iconFile(frames)
  await writeFile(path.join(root, "favicon/favicon.ico"), ico)
  await writeFile(path.resolve("public/favicon.ico"), ico)
  for (const size of [192, 512]) {
    await png(faviconSvg(), size, `favicon/android-chrome-${size}.png`)
  }
  await png(launcherSvg(), 180, "favicon/apple-touch-icon.png")
  await png(launcherSvg(), 512, "favicon/maskable-512.png")
}

async function png(svg: string, height: number, file: string) {
  const raster = await sharp(Buffer.from(svg), { density: 384 })
    .resize({ height })
    .png()
    .toBuffer()
  await writeFile(path.join(root, file), raster)
  return raster
}
