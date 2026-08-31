import { packageCommand, runCommand, runTasks } from "../process.ts"
import { writePromptTemplates } from "./prompts.ts"
import { writeSkills } from "./skills.ts"

const root = process.cwd()

await runTasks([writePromptTemplates(root), writeSkills(root)])

await runCommand({
  ...packageCommand(
    "exec",
    "biome",
    "format",
    "--write",
    "prompts/generated.ts",
    "skills/generated.ts"
  ),
  label: "content formatting",
})
