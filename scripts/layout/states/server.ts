import { serveFixture } from "../fixture/server.ts"

await serveFixture({
  page: "states/page.html",
  outDir: "dist/layout-states",
  port: Number(process.env.LAYOUT_PORT ?? 5192),
})
