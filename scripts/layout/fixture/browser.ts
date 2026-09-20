import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { serve } from "../http.ts"
import { buildFixture } from "./server.ts"

/** A fixture page built, served on a free port, and a browser to open it
 *  in: what a test of real layout, pointer, or focus behavior stands on. */
export async function openFixture(page: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "jori-fixture-"))

  await buildFixture({ page, outDir: directory, silent: true })

  const server = serve(directory, 0)
  await once(server, "listening")
  const address = server.address()

  if (!address || typeof address === "string") {
    throw new Error("Missing fixture port")
  }

  const browser = await chromium.launch()

  return {
    browser,
    url: `http://127.0.0.1:${address.port}/scripts/layout/${page}`,
    close: async () => {
      await browser.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(directory, { recursive: true, force: true })
    },
  }
}
