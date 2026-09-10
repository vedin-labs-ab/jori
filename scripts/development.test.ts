import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { expect, test } from "vitest"
import { createRegionConfig } from "../src/shared/region/config"
import config from "../vite.config"

test("keeps dev and preview servers on the frontend's configured origin", () => {
  const fallback = createRegionConfig({}, true)
  const port = Number(new URL(fallback.publicOrigin).port)
  const example = parseEnv(
    readFileSync(new URL("../.env.local.example", import.meta.url), "utf8")
  )

  expect(config.server).toMatchObject({ port, strictPort: true })
  expect(config.preview).toMatchObject({ port, strictPort: true })
  expect(createRegionConfig(example, true)).toEqual(fallback)
})
