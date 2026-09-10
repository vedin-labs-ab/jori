import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { type Browser, chromium } from "playwright"
import { drive } from "./drive.ts"
import { type Scenario } from "./types.ts"

const [manifest, output = "scripts/layout/reports/before"] =
  process.argv.slice(2)
if (!manifest) {
  throw new Error(
    "Usage: pnpm layout <manifest.json> <output-directory>. LAYOUT_APP, LAYOUT_FIXTURE and LAYOUT_STORAGE configure the run."
  )
}
const scenarios = JSON.parse(await readFile(manifest, "utf8")) as Scenario[]
const concurrency = Math.min(
  4,
  Math.max(1, Number(process.env.LAYOUT_CONCURRENCY ?? 2))
)
const sources = await Promise.all(
  [
    "probe.js",
    "drive.ts",
    "capture.ts",
    "actions.ts",
    "diff.ts",
    "types.ts",
  ].map((file) => readFile(path.join(import.meta.dirname, file)))
)
const digest = createHash("sha256").update(Buffer.concat(sources)).digest("hex")
const jobs = scenarios.flatMap((scenario) =>
  [1440, 375].flatMap((width) =>
    (["cold", "warm"] as const).map((condition) => ({
      scenario,
      width,
      condition,
    }))
  )
)
type Job = (typeof jobs)[number]
await Promise.all(Array.from({ length: concurrency }, () => worker()))

async function worker() {
  // Separate Chromium processes keep cold cache clearing away from warm runs.
  const browser = await chromium.launch()
  try {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      await record(browser, job)
    }
  } finally {
    await browser.close()
  }
}

async function measure(
  browser: Browser,
  job: Job,
  directory: string
): Promise<object> {
  const { scenario, width, condition } = job
  const blocked =
    scenario.blocked ??
    (scenario.widths && !scenario.widths.includes(width)
      ? "Control unavailable at this breakpoint by design"
      : undefined)
  if (blocked) {
    return { blocked }
  }
  try {
    return await drive(browser, scenario, {
      condition,
      width,
      output: directory,
      app: process.env.LAYOUT_APP ?? "http://localhost:5178",
      fixture: process.env.LAYOUT_FIXTURE ?? "http://127.0.0.1:5180",
      storage: process.env.LAYOUT_STORAGE,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

async function record(browser: Browser, job: Job) {
  const { scenario, width, condition } = job
  const directory = path.resolve(output, scenario.id, `${condition}-${width}`)
  await mkdir(directory, { recursive: true })
  const started = new Date().toISOString()
  const result = await measure(browser, job, directory)
  await writeFile(
    path.join(directory, "record.json"),
    JSON.stringify(
      {
        id: scenario.id,
        title: scenario.title,
        condition,
        width,
        harness: digest,
        concurrency,
        started,
        finished: new Date().toISOString(),
        ...result,
      },
      null,
      2
    )
  )
  process.stdout.write(
    `${scenario.id} ${condition} ${width} ${"error" in result ? "ERROR" : "recorded"}\n`
  )
}
