import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
import { drive } from "../drive.ts"
import { wrapFaultBrowser } from "./faults.mjs"
import {
  handlePermissionOriginRequest,
  permissionOriginPatterns,
} from "./permission.mjs"

const [specFile, output, selectedId, selectedProfile] = process.argv.slice(2)
if (!specFile || !output) {
  throw new Error(
    "Usage: transport/index.mjs <spec-module> <output> [id] [profile]"
  )
}
const { cases } = await import(path.resolve(specFile))
const sourceRoot = path.resolve(import.meta.dirname, "..")
const recipes = new Map(
  JSON.parse(
    await readFile(path.join(sourceRoot, "scenarios/shell.json"), "utf8")
  ).map((scenario) => [scenario.id, scenario])
)
const files = [
  "probe.js",
  "drive.ts",
  "capture.ts",
  "actions.ts",
  "diff.ts",
  "types.ts",
  "measurement/network.ts",
  "measurement/transport.ts",
]
const digest = createHash("sha256")
  .update(
    Buffer.concat(
      await Promise.all(
        files.map((file) => readFile(path.join(sourceRoot, file)))
      )
    )
  )
  .digest("hex")
if (
  digest !== "7bd0f4b7935def55b1b1686eb0ab475f9ae4ccc8f473d2069a9df9e40f7f6b21"
) {
  throw new Error("Frozen measurement digest changed")
}
const wrapperFiles = [
  "index.mjs",
  "faults.mjs",
  "socket.mjs",
  "signout.mjs",
  "permission.mjs",
  "response.mjs",
]
const wrapperDigest = createHash("sha256")
  .update(
    Buffer.concat(
      await Promise.all(
        wrapperFiles.map((file) =>
          readFile(path.join(import.meta.dirname, file))
        )
      )
    )
  )
  .digest("hex")
const specificationFiles = [
  path.resolve(specFile),
  ...["authentication.mjs", "resources.mjs", "scenario.mjs"].map((file) =>
    path.join(import.meta.dirname, file)
  ),
]
const specificationDigest = createHash("sha256")
  .update(
    Buffer.concat(
      await Promise.all(specificationFiles.map((file) => readFile(file)))
    )
  )
  .digest("hex")
const permissionDigest = createHash("sha256")
  .update(await readFile(path.join(import.meta.dirname, "permission.mjs")))
  .digest("hex")
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1"
let interrupted = false
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true
    process.exitCode = 130
  })
}
const browser = await chromium.launch()
try {
  outer: for (const item of cases) {
    const scenario = recipes.get(item.scenario.id) ?? item.scenario
    if (selectedId && item.scenario.id !== selectedId) {
      continue
    }
    for (const width of [1440, 375]) {
      for (const condition of ["cold", "warm"]) {
        if (interrupted || !browser.isConnected()) {
          break outer
        }
        const profile = `${condition}-${width}`
        if (selectedProfile && profile !== selectedProfile) {
          continue
        }
        const directory = path.resolve(output, item.scenario.id, profile)
        await mkdir(directory, { recursive: true })
        const started = new Date().toISOString(),
          fixtureLog = []
        const transport =
          typeof item.transport === "function"
            ? item.transport()
            : item.transport
        const wrapped = wrapFaultBrowser(browser, {
          ...transport,
          condition,
          onLog: (event) =>
            fixtureLog.push({ at: new Date().toISOString(), ...event }),
          permission: {
            patterns: permissionOriginPatterns,
            handle: handlePermissionOriginRequest,
          },
        })
        let result
        try {
          result = await drive(wrapped, scenario, {
            condition,
            width,
            output: directory,
            app: "http://localhost:5178",
            fixture: "http://127.0.0.1:5180",
            storage: process.env.LAYOUT_STORAGE,
          })
        } catch (error) {
          result = { error: error.message }
        }
        await writeFile(
          path.join(directory, "record.json"),
          JSON.stringify(
            {
              id: scenario.id,
              title: scenario.title,
              condition,
              width,
              harness: digest,
              concurrency: 1,
              started,
              finished: new Date().toISOString(),
              recipe: scenario,
              transportFixture: item.description,
              wrapperFiles,
              wrapperDigest,
              specificationFiles,
              specificationDigest,
              permissionDigest,
              fixtureLog,
              ...result,
            },
            null,
            2
          )
        )
        process.stdout.write(
          `${scenario.id} ${profile} ${result.error ? "ERROR" : "recorded"}\n`
        )
      }
    }
  }
} finally {
  await browser.close()
}
