import { runCommand, runCommands } from "./process.ts"

await runCommands([
  {
    args: ["scripts/prompts/index.ts"],
    command: process.execPath,
    label: "prompts",
  },
  {
    args: ["scripts/skills/index.ts"],
    command: process.execPath,
    label: "skills",
  },
])

await runCommand({
  args: [
    "exec",
    "biome",
    "format",
    "--write",
    "prompts/generated.ts",
    "skills/generated.ts",
  ],
  command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  label: "content formatting",
})
