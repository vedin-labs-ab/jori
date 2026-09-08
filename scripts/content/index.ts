import { spawnSync } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import { renderPromptTemplates } from "./prompts.ts"
import { renderSkills } from "./skills.ts"

/**
 * The generated content modules: prompts and skills compiled from their
 * Markdown sources. Without `--write` this only verifies, so `pnpm check`
 * never edits the tree it is checking; `pnpm content:compile` writes.
 */
const write = process.argv.includes("--write")
const root = process.cwd()
const rendered = await Promise.all(
  [await renderPromptTemplates(root), await renderSkills(root)].map(format)
)

if (write) {
  await Promise.all(
    rendered.map(({ file, content }) => writeFile(file, content))
  )
} else {
  await verify()
}

async function verify() {
  const stale: string[] = []

  for (const { file, content } of rendered) {
    if ((await readFile(file, "utf8").catch(() => "")) !== content) {
      stale.push(file)
    }
  }

  if (stale.length > 0) {
    process.stderr.write(
      `Generated content is out of date: ${stale.join(", ")}. Run pnpm content:compile.\n`
    )
    process.exit(1)
  }

  process.stdout.write("Generated content is current.\n")
}

/** Formatted the way the committed file is, so verifying compares like
 *  with like. */
function format({ file, content }: { file: string; content: string }) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "biome", "format", `--stdin-file-path=${file}`],
    { encoding: "utf8", input: content, stdio: ["pipe", "pipe", "inherit"] }
  )

  if (result.status !== 0) {
    throw new Error(`Formatting ${file} failed.`)
  }

  return { content: result.stdout, file }
}
