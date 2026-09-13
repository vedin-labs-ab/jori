import { serveFixture } from "./fixture/server.ts"

const port = Number(process.env.LAYOUT_PORT ?? 5180)
await serveFixture({
  page: "page.html",
  outDir: "dist/layout",
  port,
  define: {
    "import.meta.env.VITE_JORI_PUBLIC_ORIGIN": JSON.stringify(
      "http://localhost:5178"
    ),
    "import.meta.env.VITE_JORI_US_ORIGIN": JSON.stringify(
      "http://localhost:5178"
    ),
  },
})
process.stdout.write(
  `Layout fixture: http://127.0.0.1:${port}/scripts/layout/page.html\n`
)
