import { type BrandTheme, brand } from "../../src/shared/brand/geometry.ts"
import {
  wordmarkPaths,
  wordmarkTransform,
  wordmarkWidth,
} from "../../src/shared/brand/lettering.ts"

export function svgDocument(content: string, width = 52, height = 52) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Jori</title>${content}</svg>\n`
}

export function markArtwork(theme: BrandTheme) {
  const body = theme === "dark" ? brand.white : brand.ink
  const slit = theme === "dark" ? brand.ink : brand.white
  return `<path fill="${body}" d="${brand.body}"/><path fill="${slit}" d="${brand.slit}"/>`
}

export function markSvg(theme: BrandTheme) {
  return svgDocument(markArtwork(theme))
}

export function lockupSvg(theme: BrandTheme) {
  const ink = theme === "dark" ? brand.white : brand.ink
  const lettering = wordmarkPaths.map((path) => `<path d="${path}"/>`).join("")
  return svgDocument(
    `${markArtwork(theme)}<g fill="${ink}" transform="${wordmarkTransform}">${lettering}</g>`,
    wordmarkWidth
  )
}

/** Browser theme follows the OS, independently of the page's theme. */
export function faviconSvg(adaptive = false) {
  const style = adaptive
    ? `<style>@media(prefers-color-scheme:dark){.body{fill:${brand.white}}.slit{fill:${brand.ink}}}</style>`
    : ""
  return svgDocument(
    `${style}<path class="body" fill="${brand.ink}" d="${brand.body}"/><path class="slit" fill="${brand.white}" d="${brand.slit}"/>`
  )
}

export function avatarSvg(theme: BrandTheme) {
  const background = theme === "dark" ? "#171717" : brand.white
  return svgDocument(
    `<path fill="${background}" d="M0 0h80v80H0z"/><g transform="translate(14 14)">${markArtwork(theme)}</g>`,
    80,
    80
  )
}

/** The launcher supplies its own outer mask. The slit fits its safe circle. */
export function launcherSvg() {
  return svgDocument(
    `<path fill="${brand.ink}" d="M0 0h52v52H0z"/><path fill="${brand.white}" d="${brand.slit}"/>`
  )
}
