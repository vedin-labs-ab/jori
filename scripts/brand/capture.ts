import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { type Browser, chromium } from "playwright"
import { createServer } from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const output = path.join(root, "public/brand/social")
const formats = [
  { name: "og", width: 1200, height: 630 },
  { name: "social", width: 1080, height: 1080 },
] as const

/** Render the same console and conversation as the landing page. The
 *  isolated Vite entry needs no backend, account, or environment files. */
export async function captureSocial() {
  const server = await createServer({
    root,
    configFile: false,
    envFile: false,
    logLevel: "error",
    plugins: [tailwindcss(), react()],
    resolve: { tsconfigPaths: true },
    server: { host: "127.0.0.1", port: 0 },
  })
  let browser: Browser | undefined
  try {
    await mkdir(output, { recursive: true })
    await server.listen()
    const address = server.httpServer?.address()
    if (address === null || typeof address !== "object") {
      throw new Error("Social image server did not start")
    }
    browser = await chromium.launch()
    for (const format of formats) {
      for (const theme of ["light", "dark"] as const) {
        await captureImage(browser, address.port, format, theme)
      }
    }
  } finally {
    await browser?.close()
    await server.close()
  }
}

async function captureImage(
  browser: Browser,
  port: number,
  format: (typeof formats)[number],
  theme: "light" | "dark"
) {
  const page = await browser.newPage({
    viewport: { width: format.width, height: format.height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: "reduce",
    timezoneId: "Europe/Stockholm",
    locale: "en-US",
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(
    `http://127.0.0.1:${port}/scripts/brand/social.html?theme=${theme}&format=${format.name === "social" ? "square" : "landscape"}`,
    { waitUntil: "networkidle" }
  )
  await page.locator("[data-social-ready]").waitFor()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images, (image) => image.decode()))
  })
  if (errors.length > 0) {
    throw new Error(errors.join("\n"))
  }
  await page.screenshot({
    path: path.join(output, `${format.name}-${theme}.png`),
    animations: "disabled",
  })
  await page.close()
  process.stdout.write(`Generated ${format.name}-${theme}.png\n`)
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await captureSocial()
}
