import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { expect, it } from "vitest"

it.each([
  { option: { transportFixture: "required-wrapper" }, status: 1 },
  { option: { blocked: "Unavailable by design" }, status: 0 },
])(
  "returns $status and preserves records for $option",
  async ({ option, status }) => {
    const directory = await mkdtemp(path.join(tmpdir(), "layout-cli-"))
    const manifest = path.join(directory, "manifest.json")
    try {
      await writeFile(
        manifest,
        JSON.stringify([
          { id: "capture", title: "CLI result", path: "/", ...option },
        ])
      )
      const result = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "scripts/layout/index.ts",
          manifest,
          directory,
        ],
        {
          encoding: "utf8",
          timeout: 20_000,
          env: { ...process.env, LAYOUT_CONCURRENCY: "1" },
        }
      )
      expect(result.error).toBeUndefined()
      expect(result.status, result.stderr).toBe(status)
      for (const mode of ["cold-1440", "warm-1440", "cold-375", "warm-375"]) {
        const record = JSON.parse(
          await readFile(
            path.join(directory, "capture", mode, "record.json"),
            "utf8"
          )
        )
        expect(record).toMatchObject(
          status === 1
            ? {
                error:
                  "Transport fixture requires its wrapper: required-wrapper",
              }
            : option
        )
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  },
  30_000
)

it("rejects invalid concurrency instead of silently running no captures", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "layout-concurrency-"))
  const manifest = path.join(directory, "manifest.json")
  try {
    await writeFile(manifest, "[]")
    const result = spawnSync(
      process.execPath,
      ["scripts/layout/index.ts", manifest],
      {
        encoding: "utf8",
        timeout: 10_000,
        env: { ...process.env, LAYOUT_CONCURRENCY: "invalid" },
      }
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      "LAYOUT_CONCURRENCY must be a positive integer"
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
