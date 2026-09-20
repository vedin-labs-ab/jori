import { serveFixture } from "./fixture/server.ts"

const port = Number(process.env.LAYOUT_PORT ?? 5180)
await serveFixture({
  page: "page.html",
  outDir: "dist/layout",
  port,
})
process.stdout.write(
  `Layout fixture: http://127.0.0.1:${port}/scripts/layout/page.html\n`
)
