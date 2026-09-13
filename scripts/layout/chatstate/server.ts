import { serveFixture } from "../fixture/server.ts"

await serveFixture({
  page: "chatstate/page.html",
  outDir: "dist/layout-chat-state",
  port: Number(process.env.LAYOUT_PORT ?? 5193),
})
