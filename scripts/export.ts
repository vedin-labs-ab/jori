import { execFileSync } from "node:child_process"
import { createWriteStream } from "node:fs"
import { mkdir, open, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { isTarget } from "./env/names.ts"
import { loadTarget } from "./env/target.ts"

const [target, organizationId, output] = process.argv.slice(2)
if (!isTarget(target) || !organizationId || !output) {
  throw new Error(
    "Usage: node --experimental-strip-types scripts/export.ts <dev|prod-eu|prod-us> <organizationId> <new-output-directory>"
  )
}
const environment = loadTarget(target)
const destination = path.resolve(output)
await mkdir(destination, { mode: 0o700 })
await mkdir(path.join(destination, "files"), { mode: 0o700 })
const records = await open(
  path.join(destination, "records.ndjson"),
  "wx",
  0o600
)
let count = 0
try {
  await authRecords()
  const tables = run("export/records:inventory", {}) as string[]
  for (const section of tables) {
    await pages("export/records:page", { table: section }, async (row) => {
      await record({ section, ...row })
      count += 1
      if (section === "files") {
        await download(row._id)
      }
    })
  }
  await records.close()
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(
      {
        format: "jori-controller-export-v1",
        organizationId,
        target,
        exportedAt: new Date().toISOString(),
        records: count,
        scope:
          "Workspace content and processing records, including private content. Export is paginated, not an atomic snapshot. Authentication credentials and financial audit records are excluded. Review free text for embedded secrets before delivery.",
      },
      null,
      2
    ),
    { mode: 0o600 }
  )
} catch (error) {
  await records.close()
  throw new Error(
    "Export incomplete. Do not deliver this directory or delete the workspace until a fresh export succeeds.",
    { cause: error }
  )
}

type Row = { _id: string } & Record<string, unknown>
function run(name: string, args: Record<string, unknown>) {
  return JSON.parse(
    execFileSync(
      "npx",
      [
        "convex",
        "run",
        name,
        JSON.stringify(
          name.endsWith(":inventory") ? args : { organizationId, ...args }
        ),
        "--codegen",
        "disable",
        "--typecheck",
        "disable",
      ],
      {
        env: environment,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }
    )
  )
}
async function pages(
  name: string,
  args: Record<string, unknown>,
  consume: (row: Row) => Promise<void>
) {
  let cursor: string | null = null
  for (;;) {
    const result = run(name, { ...args, cursor }) as {
      page: Row[]
      isDone: boolean
      continueCursor: string
    }
    for (const row of result.page) {
      await consume(row)
    }
    if (result.isDone) {
      return
    }
    if (cursor === result.continueCursor) {
      throw new Error("Export cursor did not advance")
    }
    cursor = result.continueCursor
  }
}
async function download(fileId: string) {
  const file = run("export/support:file", { fileId }) as {
    url: string
    size: number
  }
  const response = await fetch(file.url)
  if (!response.ok || !response.body) {
    throw new Error("File download failed")
  }
  const filename = path.join(destination, "files", encodeURIComponent(fileId))
  await pipeline(
    Readable.from(readBody(response.body)),
    createWriteStream(filename, { flags: "wx", mode: 0o600 })
  )
  if ((await stat(filename)).size !== file.size) {
    throw new Error("Downloaded file size did not match its record")
  }
}

async function record(value: unknown) {
  await records.write(`${JSON.stringify(value)}\n`)
}

async function* readBody(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      yield value
    }
  } finally {
    await reader.cancel()
  }
}

async function authRecords() {
  const organization = run("export/organization:summary", {})
  if (!organization) {
    throw new Error(
      "Workspace was not found. Verify the regional organization ID before exporting."
    )
  }
  await record({ section: "organization", ...organization })
  count += 1
  for (const model of ["member", "invitation", "team"]) {
    await pages("export/organization:page", { model }, async (row) => {
      await record({ section: model, ...row })
      count += 1
      if (model === "team") {
        await pages(
          "export/organization:team",
          { teamId: row._id },
          async (member) => {
            await record({ section: "teamMember", ...member })
            count += 1
          }
        )
      }
    })
  }
}
